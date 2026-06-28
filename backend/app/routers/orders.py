"""
Router de pedidos.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO

from app.database import get_db
from app.schemas.order import OrderCreate, OrderResponse, OrderListResponse, OrderStatusUpdate
from app.services import order_service, invoice_service
from app.services.pricing_service import calculate_delivery_fee, get_restaurant_location
from app.core.dependencies import get_current_user, require_admin_or_driver
from app.core.exceptions import NotFoundException, ForbiddenException
from app.models.order import Order
from app.models.user import User
from pydantic import BaseModel
from typing import Optional as Opt

router = APIRouter(prefix="/orders", tags=["Pedidos"])


class CalculateFeeRequest(BaseModel):
    latitude: Opt[float] = None
    longitude: Opt[float] = None
    address: Opt[str] = None


@router.post("/calculate-fee")
def preview_delivery_fee(data: CalculateFeeRequest, db: Session = Depends(get_db)):
    """Previsualiza la tarifa de delivery para unas coordenadas (público)."""
    rlat, rlon, rname = get_restaurant_location(db)
    return calculate_delivery_fee(
        destination_lat=data.latitude,
        destination_lon=data.longitude,
        address=data.address,
        restaurant_lat=rlat,
        restaurant_lon=rlon,
        restaurant_name=rname,
    )


@router.post("", response_model=OrderResponse)
def create_order(
    data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Crear un nuevo pedido (cliente)."""
    return order_service.create_order(db, data, current_user)


@router.get("", response_model=OrderListResponse)
def list_orders(
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Listar pedidos (filtrados por rol)."""
    orders, total = order_service.get_orders(db, current_user, status, skip, limit)
    return OrderListResponse(orders=orders, total=total)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Obtener detalles de un pedido."""
    return order_service.get_order_by_id(db, order_id, current_user)


@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    current_user: User = Depends(require_admin_or_driver),
    db: Session = Depends(get_db),
):
    """Actualizar estado del pedido (admin o repartidor)."""
    return order_service.update_order_status(db, order_id, data.status, current_user)


@router.patch("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancelar un pedido (cliente o admin)."""
    return order_service.cancel_order(db, order_id, current_user)


@router.get("/{order_id}/tracking")
def order_tracking(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Ubicación en vivo del repartidor para un pedido activo.

    Devuelve coordenadas del driver, estado del pedido, info del cliente.
    Accesible por: el dueño del pedido, el repartidor asignado, o admin.
    """
    from app.models.delivery import DeliveryProfile

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise NotFoundException("Pedido no encontrado")

    # Permisos
    if current_user.role == "customer" and order.customer_id != current_user.id:
        raise ForbiddenException("No tienes acceso a este pedido")
    if current_user.role == "delivery_driver" and order.delivery_driver_id != current_user.id:
        raise ForbiddenException("No tienes acceso a este pedido")

    profile = None
    if order.delivery_driver_id:
        profile = (
            db.query(DeliveryProfile)
            .filter(DeliveryProfile.user_id == order.delivery_driver_id)
            .first()
        )

    return {
        "order_id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "driver_id": order.delivery_driver_id,
        "driver_name": order.delivery_driver.full_name if order.delivery_driver else None,
        "driver_phone": order.delivery_driver.phone if order.delivery_driver else None,
        "driver_latitude": profile.latitude if profile else None,
        "driver_longitude": profile.longitude if profile else None,
        "driver_zone": profile.current_zone if profile else None,
        "driver_vehicle_type": (
            profile.vehicle_type.value if profile and profile.vehicle_type else None
        ),
        "driver_updated_at": (
            profile.last_location_update.isoformat()
            if profile and profile.last_location_update else None
        ),
        "delivery_address": order.delivery_address,
        "is_active": order.status not in ("delivered", "canceled"),
    }


@router.get("/{order_id}/invoice")
def download_invoice(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Descargar la factura del pedido como PDF.

    El cliente solo puede descargar la factura de sus propios pedidos.
    El admin puede descargar cualquiera.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise NotFoundException("Pedido no encontrado")
    if current_user.role != "admin" and order.customer_id != current_user.id:
        raise ForbiddenException("No tienes acceso a la factura de este pedido")

    pdf_bytes = invoice_service.generate_invoice_pdf(order)
    filename = f"factura-{order.order_number.replace('#', '')}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
