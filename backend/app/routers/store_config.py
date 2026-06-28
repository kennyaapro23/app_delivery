"""
Configuración de la tienda (ubicación del restaurante).
GET  /store-config       — público (todos los roles ven el pin del restaurante)
PATCH /store-config      — solo admin
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.core.dependencies import require_admin
from app.models.store_config import StoreConfig
from app.models.user import User

router = APIRouter(prefix="/store-config", tags=["Store Config"])


def _get_or_create(db: Session) -> StoreConfig:
    cfg = db.query(StoreConfig).filter(StoreConfig.id == 1).first()
    if not cfg:
        cfg = StoreConfig(id=1)
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg


@router.get("")
def get_store_config(db: Session = Depends(get_db)):
    """Devuelve la configuración pública de la tienda (nombre, coords, teléfono)."""
    cfg = _get_or_create(db)
    return {
        "id": cfg.id,
        "name": cfg.name,
        "address": cfg.address,
        "latitude": cfg.latitude,
        "longitude": cfg.longitude,
        "phone": cfg.phone,
    }


class StoreConfigUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None


@router.patch("")
def update_store_config(
    body: StoreConfigUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Actualiza la configuración de la tienda (solo admin)."""
    cfg = _get_or_create(db)
    if body.name is not None:
        cfg.name = body.name
    if body.address is not None:
        cfg.address = body.address
    if body.latitude is not None:
        cfg.latitude = body.latitude
    if body.longitude is not None:
        cfg.longitude = body.longitude
    if body.phone is not None:
        cfg.phone = body.phone
    db.commit()
    db.refresh(cfg)
    return {
        "id": cfg.id,
        "name": cfg.name,
        "address": cfg.address,
        "latitude": cfg.latitude,
        "longitude": cfg.longitude,
        "phone": cfg.phone,
    }
