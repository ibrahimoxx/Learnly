from pydantic import BaseModel


class CheckoutSessionCreate(BaseModel):
    course_id: str


class CheckoutSessionRead(BaseModel):
    checkout_url: str
    session_id: str
