from pydantic import BaseModel, Field


class CheckoutSessionCreate(BaseModel):
    course_id: str
    coupon_code: str | None = None
    affiliate_code: str | None = Field(None, max_length=20, pattern=r"^[A-Z0-9]+$")


class CheckoutSessionRead(BaseModel):
    checkout_url: str
    session_id: str


class GiftCheckoutSessionCreate(BaseModel):
    course_id: str
    recipient_email: str = Field(..., max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    gift_message: str | None = Field(None, max_length=500)
