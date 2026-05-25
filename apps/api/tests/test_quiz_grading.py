"""Test quiz grading logic across all question scenarios."""
import pytest

PASS_THRESHOLD = 0.7


def grade_quiz(questions: list[dict], answers: list[int | None]) -> dict:
    """Replicate the grading logic from quiz.py."""
    total = len(questions)
    padded = list(answers) + [None] * max(0, total - len(answers))
    padded = padded[:total]

    score = sum(
        1 for i, q in enumerate(questions)
        if padded[i] is not None and padded[i] == q["correct_index"]
    )
    passed = (score / total) >= PASS_THRESHOLD if total > 0 else False

    results = [
        {
            "selected_index": padded[i] if i < len(padded) else None,
            "correct_index": q["correct_index"],
            "is_correct": padded[i] == q["correct_index"] if i < len(padded) else False,
        }
        for i, q in enumerate(questions)
    ]
    return {"score": score, "total": total, "passed": passed, "results": results}


# Fixtures
Q4 = [
    {"correct_index": 1},  # print()
    {"correct_index": 2},  # int
    {"correct_index": 2},  # 2**3=8
    {"correct_index": 1},  # def
]


def test_all_correct():
    result = grade_quiz(Q4, [1, 2, 2, 1])
    assert result["score"] == 4
    assert result["total"] == 4
    assert result["passed"] is True
    assert all(r["is_correct"] for r in result["results"])


def test_all_wrong():
    result = grade_quiz(Q4, [0, 0, 0, 0])
    assert result["score"] == 0
    assert result["passed"] is False
    assert not any(r["is_correct"] for r in result["results"])


def test_pass_threshold_exact():
    """3/4 = 75% → pass."""
    result = grade_quiz(Q4, [1, 2, 2, 0])  # 3 correct
    assert result["score"] == 3
    assert result["passed"] is True


def test_below_threshold():
    """2/4 = 50% → fail."""
    result = grade_quiz(Q4, [1, 2, 0, 0])  # 2 correct
    assert result["score"] == 2
    assert result["passed"] is False


def test_none_answers_treated_as_wrong():
    result = grade_quiz(Q4, [None, None, None, None])
    assert result["score"] == 0
    assert result["passed"] is False
    assert not any(r["is_correct"] for r in result["results"])


def test_partial_none_answers():
    """2 correct, 2 None → 50% → fail."""
    result = grade_quiz(Q4, [1, 2, None, None])
    assert result["score"] == 2
    assert result["passed"] is False


def test_retake_higher_score():
    """Second attempt all correct should pass."""
    first = grade_quiz(Q4, [0, 0, 0, 0])
    second = grade_quiz(Q4, [1, 2, 2, 1])
    assert first["passed"] is False
    assert second["passed"] is True


def test_two_question_quiz_exact_threshold():
    """2/2 = 100% → pass. 1/2 = 50% → fail."""
    q2 = [{"correct_index": 0}, {"correct_index": 1}]
    assert grade_quiz(q2, [0, 1])["passed"] is True
    assert grade_quiz(q2, [0, 0])["passed"] is False


def test_result_fields_populated():
    result = grade_quiz(Q4, [1, 0, 2, 1])
    for r in result["results"]:
        assert "selected_index" in r
        assert "correct_index" in r
        assert "is_correct" in r
