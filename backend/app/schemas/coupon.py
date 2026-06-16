"""
Schemas de cupón.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CouponCreate(BaseModel):
    code: str
    description: Optional[str] = None
    discount_percent: Optional[float] = None
    discount_amount: Optional[float] = None
    min_order_amount: float = 0.0
    max_uses: int = 1
    expires_at: Optional[datetime] = None


class CouponResponse(BaseModel):
    id: int
    code: str
    description: Optional[str] = None
    discount_percent: Optional[float] = None
    discount_amount: Optional[float] = None
    min_order_amount: float
    max_uses: int
    current_uses: int
    is_active: bool
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ApplyCouponRequest(BaseModel):
    code: str
    order_subtotal: float


class ApplyCouponResponse(BaseModel):
    valid: bool
    discount: float
    message: str
