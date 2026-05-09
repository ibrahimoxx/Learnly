from pydantic import BaseModel


class CheckoutSessionCreate(BaseModel):
    course_id: str
    coupon_code: str | None = None


class CheckoutSessionRead(BaseModel):
    checkout_url: str
    session_id: str
