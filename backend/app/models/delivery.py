"""
Modelos de Repartidor: DeliveryProfile y DeliveryEarning.
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
    Enum as SAEnum,
)
from sqlalchemy.orm import relationship

from app.database import Base

import enum


class VehicleType(str, enum.Enum):
    MOTO = "moto"
    BICICLETA = "bicicleta"
    AUTO = "auto"


class DeliveryProfile(Base):
    __tablename__ = "delivery_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # ─── Datos personales ──────────────────────────────────────
    document_id = Column(String(20), nullable=True)  # DNI / Carnet
    birth_date = Column(String(10), nullable=True)   # YYYY-MM-DD
    gender = Column(String(20), nullable=True)       # masculino, femenino, otro
    home_address = Column(String(255), nullable=True)
    home_district = Column(String(100), nullable=True)

    # Contacto de emergencia
    emergency_contact_name = Column(String(150), nullable=True)
    emergency_contact_phone = Column(String(30), nullable=True)
    emergency_contact_relation = Column(String(50), nullable=True)  # madre, pareja...

    # ─── Vehículo ──────────────────────────────────────────────
    vehicle_type = Column(
        SAEnum(VehicleType, name="vehicle_type", create_constraint=True),
        nullable=True,
    )
    vehicle_brand = Column(String(50), nullable=True)
    vehicle_model = Column(String(80), nullable=True)
    vehicle_year = Column(Integer, nullable=True)
    vehicle_color = Column(String(40), nullable=True)
    vehicle_plate = Column(String(20), nullable=True)
    license_number = Column(String(50), nullable=True)
    license_expiry = Column(String(10), nullable=True)  # YYYY-MM-DD
    insurance_number = Column(String(50), nullable=True)
    insurance_expiry = Column(String(10), nullable=True)

    # ─── Banco ─────────────────────────────────────────────────
    bank_name = Column(String(100), nullable=True)
    bank_account_type = Column(String(30), nullable=True)  # ahorros / corriente
    bank_account = Column(String(50), nullable=True)
    bank_cci = Column(String(50), nullable=True)
    bank_account_holder = Column(String(150), nullable=True)

    # ─── Estado y ubicación ────────────────────────────────────
    is_available = Column(Boolean, default=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    current_zone = Column(String(100), nullable=True)
    last_location_update = Column(DateTime, nullable=True)

    # ─── Estadísticas ──────────────────────────────────────────
    total_deliveries = Column(Integer, default=0)
    average_rating = Column(Float, default=0.0)
    total_earnings = Column(Float, default=0.0)

    # Round-robin: timestamp de la última asignación recibida.
    last_assigned_at = Column(DateTime, nullable=True, index=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user = relationship("User", back_populates="delivery_profile")
    earnings = relationship("DeliveryEarning", back_populates="driver_profile")

    def __repr__(self):
        return f"<DeliveryProfile user_id={self.user_id} available={self.is_available}>"


class DeliveryEarning(Base):
    __tablename__ = "delivery_earnings"

    id = Column(Integer, primary_key=True, index=True)
    driver_profile_id = Column(
        Integer, ForeignKey("delivery_profiles.id"), nullable=False
    )
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    amount = Column(Float, nullable=False)
    earned_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    driver_profile = relationship("DeliveryProfile", back_populates="earnings")
    order = relationship("Order")

    def __repr__(self):
        return f"<DeliveryEarning S/{self.amount}>"
