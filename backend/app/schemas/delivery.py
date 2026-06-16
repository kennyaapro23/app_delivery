"""
Schemas de repartidor.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class DeliveryProfileCreate(BaseModel):
    document_id: Optional[str] = None
    vehicle_type: Optional[str] = None  # moto, bicicleta, auto
    vehicle_plate: Optional[str] = None
    license_number: Optional[str] = None
    insurance_number: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None


class DeliveryProfileUpdate(BaseModel):
    document_id: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_plate: Optional[str] = None
    license_number: Optional[str] = None
    insurance_number: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None


class DeliveryProfileResponse(BaseModel):
    id: int
    user_id: int
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    # Personales
    document_id: Optional[str] = None
    birth_date: Optional[str] = None
    gender: Optional[str] = None
    home_address: Optional[str] = None
    home_district: Optional[str] = None
    # Emergencia
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    # Vehículo
    vehicle_type: Optional[str] = None
    vehicle_brand: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[int] = None
    vehicle_color: Optional[str] = None
    vehicle_plate: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[str] = None
    insurance_number: Optional[str] = None
    insurance_expiry: Optional[str] = None
    # Banco
    bank_name: Optional[str] = None
    bank_account_type: Optional[str] = None
    bank_account: Optional[str] = None
    bank_cci: Optional[str] = None
    bank_account_holder: Optional[str] = None
    # Estado
    is_available: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    current_zone: Optional[str] = None
    total_deliveries: int
    average_rating: float
    total_earnings: float

    class Config:
        from_attributes = True


class LocationUpdate(BaseModel):
    latitude: float
    longitude: float
    zone: Optional[str] = None


class ToggleAvailabilityResponse(BaseModel):
    is_available: bool
    message: str


class EarningResponse(BaseModel):
    id: int
    order_id: int
    amount: float
    earned_at: datetime

    class Config:
        from_attributes = True


class EarningsSummary(BaseModel):
    today: float
    this_week: float
    this_month: float
    total: float
    deliveries_today: int
    deliveries_total: int


class DriverStatsResponse(BaseModel):
    deliveries_today: int
    deliveries_completed: int
    earnings_today: float
    average_rating: float
    punctuality: float
    satisfaction: float
    efficiency: float
