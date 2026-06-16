"""
Schemas de reseña.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    order_id: int
    rating: float = Field(ge=1.0, le=5.0)
    comment: Optional[str] = None


class ReviewResponse(BaseModel):
    id: int
    order_id: int
    customer_id: int
    driver_id: Optional[int] = None
    rating: float
    comment: Optional[str] = None
    created_at: datetime
    customer_name: Optional[str] = None

    class Config:
        from_attributes = True
