"""
Modelo de Dirección de usuario.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Address(Base):
    __tablename__ = "addresses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    label = Column(String(50), nullable=False, default="Casa")  # Casa, Oficina, etc.
    full_address = Column(String(500), nullable=False)
    reference = Column(String(255), nullable=True)
    district = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="addresses")

    def __repr__(self):
        return f"<Address {self.label}: {self.full_address}>"
