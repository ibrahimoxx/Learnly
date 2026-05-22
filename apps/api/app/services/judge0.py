import asyncio
import base64

import httpx
import structlog

from app.core.config import settings

logger = structlog.get_logger()

_POLL_INTERVAL = 1.0
_POLL_MAX_ATTEMPTS = 30


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
    """Run all test cases and return aggregated results."""
    if not test_cases:
        return {"tests_passed": 0, "tests_total": 0, "results": [], "status": "accepted"}

    results = []
    passed = 0

    for i, tc in enumerate(test_cases):
        try:
            token = await submit_code(source_code, language_id, tc.get("input", ""))
            data = await get_submission(token)
        except Exception as exc:
            logger.error("judge0_test_case_error", index=i, error=str(exc))
            results.append({
                "index": i,
                "passed": False,
                "stdout": None,
                "expected": tc.get("expected_output", ""),
                "time_ms": None,
                "memory_kb": None,
            })
            continue

        actual = (data.get("stdout") or "").strip()
        expected = tc.get("expected_output", "").strip()
        is_passed = actual == expected and data.get("status", {}).get("id") == 3

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
