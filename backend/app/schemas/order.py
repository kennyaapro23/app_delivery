"""
Schemas de pedido.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = 1


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_price: float
    subtotal: float

    class Config:
        from_attributes = True


class OrderTimelineResponse(BaseModel):
    id: int
    status: str
    title: str
    description: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    items: list[OrderItemCreate]
    delivery_address: str
    payment_method: str = "efectivo"  # efectivo, yape, tarjeta
    notes: Optional[str] = None
    coupon_code: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: str  # new status


class OrderResponse(BaseModel):
    id: int
    order_number: str
    customer_id: int
    delivery_driver_id: Optional[int] = None
    status: str
    subtotal: float
    delivery_fee: float
    tax: float
    total: float
    payment_method: str
    delivery_address: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemResponse] = []
    timeline: list[OrderTimelineResponse] = []

    # Información expandida
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None

    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    orders: list[OrderResponse]
    total: int
