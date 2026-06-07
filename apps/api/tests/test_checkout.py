from types import SimpleNamespace
from uuid import uuid4

import pytest
import stripe
from fastapi import HTTPException

from app.api.v1 import checkout
from app.db.tables.coupon import Coupon
from app.db.tables.course import Course
from app.db.tables.user import User
from app.schemas.checkout import CheckoutSessionCreate


class FakeResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class FakeDB:
    def __init__(self, *results):
        self.results = list(results)
        self.commit_calls = 0

    async def execute(self, _query):
        return FakeResult(self.results.pop(0))

    async def commit(self):
        self.commit_calls += 1


@pytest.mark.asyncio
async def test_create_checkout_session_returns_502_on_stripe_error(monkeypatch):
    course = Course(
        id=uuid4(),
        slug="paid-course",
        title="Paid course",
        status="published",
        is_free=False,
        price_in_cents=1999,
        instructor_id=uuid4(),
    )
    user = User(
        id=uuid4(),
        clerk_id="clerk_user",
        email="student@example.com",
        role="student",
        is_active=True,
    )
    db = FakeDB(course, None)

    async def fail_create(**_params):
        raise stripe.APIConnectionError("stripe offline")

    monkeypatch.setattr(checkout, "_create_stripe_session", fail_create)

    with pytest.raises(HTTPException) as exc_info:
        await checkout.create_checkout_session(
            CheckoutSessionCreate(course_id=str(course.id)),
            user=user,
            db=db,
        )

    assert exc_info.value.status_code == 502
    assert exc_info.value.detail == "Payment provider error: stripe offline"
    assert db.commit_calls == 0


@pytest.mark.asyncio
async def test_create_checkout_session_commits_coupon_after_success(monkeypatch):
    course = Course(
        id=uuid4(),
        slug="machine-learning-a–z",
        title="Paid course",
        status="published",
        is_free=False,
        price_in_cents=1999,
        instructor_id=uuid4(),
    )
    user = User(
        id=uuid4(),
        clerk_id="clerk_user",
        email="student@example.com",
        role="student",
        is_active=True,
    )
    coupon = Coupon(
        id=uuid4(),
        created_by=uuid4(),
        code="SAVE10",
        discount_type="fixed",
        discount_value=500,
        uses_count=0,
        is_active=True,
    )
    db = FakeDB(course, None, coupon)

    async def create_session(**params):
        assert params["line_items"][0]["price_data"]["unit_amount"] == 1499
        assert params["cancel_url"].endswith("course=machine-learning-a%E2%80%93z")
        assert coupon.uses_count == 0
        return SimpleNamespace(id="sess_123", url="https://checkout.stripe.com/test-session")

    monkeypatch.setattr(checkout, "_create_stripe_session", create_session)

    result = await checkout.create_checkout_session(
        CheckoutSessionCreate(course_id=str(course.id), coupon_code="save10"),
        user=user,
        db=db,
    )

    assert result.checkout_url == "https://checkout.stripe.com/test-session"
    assert result.session_id == "sess_123"
    assert coupon.uses_count == 1
    assert db.commit_calls == 1
