"""
Modelo de Cupón de descuento.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    discount_percent = Column(Float, nullable=True)  # e.g., 10.0 = 10%
    discount_amount = Column(Float, nullable=True)  # e.g., 5.00 = S/5
    min_order_amount = Column(Float, default=0.0)
    max_uses = Column(Integer, default=1)
    current_uses = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    usages = relationship("CouponUsage", back_populates="coupon")

    def __repr__(self):
        return f"<Coupon {self.code}>"


class CouponUsage(Base):
    __tablename__ = "coupon_usages"

    id = Column(Integer, primary_key=True, index=True)
    coupon_id = Column(Integer, ForeignKey("coupons.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    used_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    coupon = relationship("Coupon", back_populates="usages")

    def __repr__(self):
        return f"<CouponUsage coupon={self.coupon_id} user={self.user_id}>"
