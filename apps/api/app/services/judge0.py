import asyncio
import base64
import os
import subprocess
import tempfile

import httpx
import structlog

from app.core.config import settings

logger = structlog.get_logger()

_POLL_INTERVAL = 1.0
_POLL_MAX_ATTEMPTS = 30

# language_id → (executable, file_extension)
# Used as fallback when Judge0 sandbox fails (e.g. no cgroupv1 on WSL2)
_LOCAL_RUNNERS: dict[int, tuple[str, str]] = {
    63: ("node", ".js"),
    71: ("python" if os.name == "nt" else "python3", ".py"),
}


def _run_local_sync(source_code: str, language_id: int, stdin: str) -> dict:
    """Synchronous local code runner — called via executor to avoid blocking event loop.
    Uses subprocess.run with a fixed executable list (no shell=True), so no injection risk.
    Executable is a fixed string from _LOCAL_RUNNERS; only user-provided code goes to stdin/file.
    """
    runner = _LOCAL_RUNNERS.get(language_id)
    if runner is None:
        return {"status": {"id": 13, "description": "Unsupported language"}, "stdout": None}

    executable, ext = runner
    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=ext, delete=False, encoding="utf-8")
    try:
        tmp.write(source_code)
        tmp.close()

        result = subprocess.run(  # noqa: S603
            [executable, tmp.name],
            input=stdin.encode() if stdin else b"",
            capture_output=True,
            timeout=10.0,
        )

        stdout_text = result.stdout.decode("utf-8", errors="replace")
        stderr_text = result.stderr.decode("utf-8", errors="replace")

        return {
            "status": {"id": 3, "description": "Accepted"},
            "stdout": stdout_text,
            "stderr": stderr_text,
            "time": None,
            "memory": None,
        }
    except subprocess.TimeoutExpired:
        return {"status": {"id": 5, "description": "Time Limit Exceeded"}, "stdout": None}
    except FileNotFoundError:
        return {"status": {"id": 13, "description": f"Runtime not found: {executable}"}, "stdout": None}
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass


async def _run_local(source_code: str, language_id: int, stdin: str) -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _run_local_sync, source_code, language_id, stdin)


async def submit_code(source_code: str, language_id: int, stdin: str = "") -> str:
    """Submit source code to Judge0 and return the submission token."""
    payload = {
        "source_code": base64.b64encode(source_code.encode()).decode(),
        "language_id": language_id,
        "stdin": base64.b64encode(stdin.encode()).decode(),
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.post(
            f"{settings.judge0_url}/submissions?base64_encoded=true&wait=false",
            json=payload,
        )
        r.raise_for_status()
        return r.json()["token"]


async def get_submission(token: str) -> dict:
    """Poll Judge0 until the submission finishes (status_id >= 3)."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        for _ in range(_POLL_MAX_ATTEMPTS):
            r = await client.get(
                f"{settings.judge0_url}/submissions/{token}?base64_encoded=true"
            )
            r.raise_for_status()
            data = r.json()
            if data.get("status", {}).get("id", 1) >= 3:
                return _decode_submission(data)
            await asyncio.sleep(_POLL_INTERVAL)

    return {"status": {"id": 3, "description": "Timeout"}, "stdout": None, "stderr": "Execution timed out"}


def _decode_submission(data: dict) -> dict:
    for field in ("stdout", "stderr", "compile_output"):
        raw = data.get(field)
        if raw:
            try:
                data[field] = base64.b64decode(raw).decode("utf-8", errors="replace")
            except Exception:
                pass
    return data


async def run_test_cases(
    source_code: str, language_id: int, test_cases: list[dict]
) -> dict:
    """Run all test cases via Judge0; falls back to local subprocess if Judge0 returns Internal Error."""
    if not test_cases:
        return {"tests_passed": 0, "tests_total": 0, "results": [], "status": "accepted"}

    results = []
    passed = 0

    for i, tc in enumerate(test_cases):
        stdin = tc.get("input", "")
        data: dict | None = None

        try:
            token = await submit_code(source_code, language_id, stdin)
            data = await get_submission(token)
        except Exception as exc:
            logger.warning("judge0_unavailable", index=i, error=str(exc), fallback="local")

        # Fall back to local runner when Judge0 returns Internal Error (status 13)
        if data is None or data.get("status", {}).get("id") == 13:
            logger.info("judge0_local_fallback", index=i, language_id=language_id)
            data = await _run_local(source_code, language_id, stdin)

        actual = (data.get("stdout") or "").strip()
        expected = tc.get("expected_output", "").strip()
        status_id = data.get("status", {}).get("id")
        is_passed = actual == expected and status_id == 3

        if is_passed:
            passed += 1

        time_ms = None
        if data.get("time"):
            try:
                time_ms = int(float(data["time"]) * 1000)
            except (ValueError, TypeError):
                pass

        results.append({
            "index": i,
            "passed": is_passed,
            "stdout": data.get("stdout"),
            "expected": tc.get("expected_output", ""),
            "time_ms": time_ms,
            "memory_kb": data.get("memory"),
        })

    overall = "accepted" if passed == len(test_cases) else "wrong_answer"
    return {
        "tests_passed": passed,
        "tests_total": len(test_cases),
        "results": results,
        "status": overall,
    }
