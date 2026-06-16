"""
Modelo de Reseña / Calificación.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    rating = Column(Float, nullable=False)  # 1.0 - 5.0
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    order = relationship("Order", back_populates="review")
    customer = relationship("User", back_populates="reviews", foreign_keys=[customer_id])

    def __repr__(self):
        return f"<Review order={self.order_id} rating={self.rating}>"
