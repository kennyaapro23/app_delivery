"""
Schemas de autenticación.
"""

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: str | None = None
    role: str = "customer"  # admin, customer, delivery_driver


class DriverRegisterRequest(BaseModel):
    """Registro de repartidor: crea User + DeliveryProfile en una sola llamada."""
    # ── Datos de la cuenta ──
    email: EmailStr
    password: str
    full_name: str
    phone: str | None = None

    # ── Datos personales ──
    document_id: str | None = None
    birth_date: str | None = None
    gender: str | None = None  # masculino, femenino, otro
    home_address: str | None = None
    home_district: str | None = None

    # ── Contacto de emergencia ──
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    emergency_contact_relation: str | None = None

    # ── Vehículo ──
    vehicle_type: str | None = None  # moto, bicicleta, auto
    vehicle_brand: str | None = None
    vehicle_model: str | None = None
    vehicle_year: int | None = None
    vehicle_color: str | None = None
    vehicle_plate: str | None = None
    license_number: str | None = None
    license_expiry: str | None = None
    insurance_number: str | None = None
    insurance_expiry: str | None = None

    # ── Banco ──
    bank_name: str | None = None
    bank_account_type: str | None = None  # ahorros, corriente
    bank_account: str | None = None
    bank_cci: str | None = None
    bank_account_holder: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    role: str
    full_name: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str
