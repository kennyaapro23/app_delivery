"""
Modelos de Pedido: Order, OrderItem, OrderTimeline.
Flujo de estados: pending → accepted → preparing → ready → on_the_way → delivered | canceled
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
    Text,
    Enum as SAEnum,
)
from sqlalchemy.orm import relationship

from app.database import Base

import enum


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    PREPARING = "preparing"
    READY = "ready"
    ON_THE_WAY = "on_the_way"
    DELIVERED = "delivered"
    CANCELED = "canceled"


class PaymentMethod(str, enum.Enum):
    EFECTIVO = "efectivo"
    YAPE = "yape"
    TARJETA = "tarjeta"


# Mapeo de estados a labels en español
ORDER_STATUS_LABELS = {
    OrderStatus.PENDING: "Pendiente",
    OrderStatus.ACCEPTED: "Aceptado",
    OrderStatus.PREPARING: "En Preparación",
    OrderStatus.READY: "Listo para Entrega",
    OrderStatus.ON_THE_WAY: "En Ruta",
    OrderStatus.DELIVERED: "Entregado",
    OrderStatus.CANCELED: "Cancelado",
}

# Transiciones de estado válidas
VALID_STATUS_TRANSITIONS = {
    OrderStatus.PENDING: [OrderStatus.ACCEPTED, OrderStatus.CANCELED],
    OrderStatus.ACCEPTED: [OrderStatus.PREPARING, OrderStatus.CANCELED],
    OrderStatus.PREPARING: [OrderStatus.READY, OrderStatus.CANCELED],
    OrderStatus.READY: [OrderStatus.ON_THE_WAY],
    OrderStatus.ON_THE_WAY: [OrderStatus.DELIVERED],
    OrderStatus.DELIVERED: [],
    OrderStatus.CANCELED: [],
}


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(20), unique=True, nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    delivery_driver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(
        SAEnum(OrderStatus, name="order_status", create_constraint=True),
        default=OrderStatus.PENDING,
        nullable=False,
    )
    subtotal = Column(Float, nullable=False, default=0.0)
    delivery_fee = Column(Float, nullable=False, default=5.0)
    tax = Column(Float, nullable=False, default=0.0)
    total = Column(Float, nullable=False, default=0.0)
    payment_method = Column(
        SAEnum(PaymentMethod, name="payment_method", create_constraint=True),
        nullable=False,
        default=PaymentMethod.EFECTIVO,
    )
    delivery_address = Column(Text, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    customer = relationship(
        "User", back_populates="orders", foreign_keys=[customer_id]
    )
    delivery_driver = relationship(
        "User", back_populates="delivery_orders", foreign_keys=[delivery_driver_id]
    )
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    timeline = relationship(
        "OrderTimeline", back_populates="order", cascade="all, delete-orphan",
        order_by="OrderTimeline.timestamp"
    )
    review = relationship("Review", back_populates="order", uselist=False)

    def __repr__(self):
        return f"<Order {self.order_number} - {self.status}>"


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    product_name = Column(String(200), nullable=False)  # Snapshot del nombre
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)

    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

    def __repr__(self):
        return f"<OrderItem {self.product_name} x{self.quantity}>"


class OrderTimeline(Base):
    __tablename__ = "order_timeline"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    order = relationship("Order", back_populates="timeline")

    def __repr__(self):
        return f"<OrderTimeline {self.title} @ {self.timestamp}>"
