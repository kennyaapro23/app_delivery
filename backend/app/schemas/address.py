"""
Schemas de dirección.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AddressCreate(BaseModel):
    label: str = "Casa"
    full_address: str
    reference: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_default: bool = False


class AddressUpdate(BaseModel):
    label: Optional[str] = None
    full_address: Optional[str] = None
    reference: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_default: Optional[bool] = None


class AddressResponse(BaseModel):
    id: int
    user_id: int
    label: str
    full_address: str
    reference: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True
