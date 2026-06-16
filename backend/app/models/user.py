"""
Modelo de Usuario.
Soporta roles: admin, customer, delivery_driver
"""

from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Enum as SAEnum,
)
from sqlalchemy.orm import relationship

from app.database import Base

import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    CUSTOMER = "customer"
    DELIVERY_DRIVER = "delivery_driver"


class MembershipLevel(str, enum.Enum):
    BRONCE = "BRONCE"
    PLATA = "PLATA"
    ORO = "ORO"
    PLATINO = "PLATINO"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(
        SAEnum(UserRole, name="user_role", create_constraint=True),
        nullable=False,
        default=UserRole.CUSTOMER,
    )
    is_active = Column(Boolean, default=True)
    points = Column(Integer, default=0)
    membership_level = Column(
        SAEnum(MembershipLevel, name="membership_level", create_constraint=True),
        default=MembershipLevel.BRONCE,
    )
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    orders = relationship(
        "Order", back_populates="customer", foreign_keys="Order.customer_id"
    )
    delivery_orders = relationship(
        "Order",
        back_populates="delivery_driver",
        foreign_keys="Order.delivery_driver_id",
    )
    delivery_profile = relationship(
        "DeliveryProfile", back_populates="user", uselist=False
    )
    addresses = relationship("Address", back_populates="user")
    reviews = relationship(
        "Review", back_populates="customer", foreign_keys="Review.customer_id"
    )

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"
