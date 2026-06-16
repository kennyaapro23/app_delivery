"""
Router de repartidores.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.delivery import (
    LocationUpdate, ToggleAvailabilityResponse, EarningsSummary, DriverStatsResponse,
)
from app.schemas.order import OrderResponse
from app.services import delivery_service, order_service
from app.core.dependencies import require_driver, require_admin, get_current_user
from app.models.user import User

router = APIRouter(prefix="/delivery", tags=["Repartidores"])


@router.post("/toggle-availability", response_model=ToggleAvailabilityResponse)
def toggle_availability(
    driver: User = Depends(require_driver),
    db: Session = Depends(get_db),
):
    """Cambiar disponibilidad del repartidor."""
    return delivery_service.toggle_availability(db, driver)


@router.patch("/location")
def update_location(
    data: LocationUpdate,
    driver: User = Depends(require_driver),
    db: Session = Depends(get_db),
):
    """Actualizar ubicación GPS del repartidor."""
    profile = delivery_service.update_location(db, driver, data)
    return {"message": "Ubicación actualizada", "latitude": profile.latitude, "longitude": profile.longitude}


@router.get("/nearby-orders")
def get_nearby_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    driver: User = Depends(require_driver),
    db: Session = Depends(get_db),
):
    """Ver pedidos cercanos disponibles."""
    orders = delivery_service.get_nearby_orders(db, driver, skip, limit)
    return {"orders": [
        {"id": o.id, "order_number": o.order_number, "status": o.status,
         "delivery_address": o.delivery_address, "total": o.total,
         "delivery_fee": o.delivery_fee, "payment_method": o.payment_method,
         "created_at": o.created_at.isoformat()}
        for o in orders
    ]}


@router.post("/accept/{order_id}")
def accept_order(
    order_id: int,
    driver: User = Depends(require_driver),
    db: Session = Depends(get_db),
):
    """Aceptar un pedido para entrega."""
    order = delivery_service.accept_order(db, order_id, driver)
    return {"message": f"Pedido {order.order_number} aceptado", "order_id": order.id}


@router.patch("/complete/{order_id}")
def complete_delivery(
    order_id: int,
    driver: User = Depends(require_driver),
    db: Session = Depends(get_db),
):
    """Marcar pedido como entregado."""
    order = delivery_service.complete_delivery(db, order_id, driver)
    return {"message": f"Pedido {order.order_number} entregado", "order_id": order.id}


@router.get("/earnings", response_model=EarningsSummary)
def get_earnings(
    driver: User = Depends(require_driver),
    db: Session = Depends(get_db),
):
    """Resumen de ganancias del repartidor."""
    return delivery_service.get_earnings_summary(db, driver)


@router.get("/stats", response_model=DriverStatsResponse)
def get_driver_stats(
    driver: User = Depends(require_driver),
    db: Session = Depends(get_db),
):
    """Estadísticas de rendimiento del repartidor."""
    return delivery_service.get_driver_stats(db, driver)


@router.get("/drivers")
def list_all_drivers(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Listar todos los repartidores (solo admin)."""
    return delivery_service.get_all_drivers(db)
