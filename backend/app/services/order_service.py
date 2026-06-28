"""
Servicio de pedidos.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.order import (
    Order, OrderItem, OrderTimeline, OrderStatus, PaymentMethod,
    VALID_STATUS_TRANSITIONS, ORDER_STATUS_LABELS,
)
from app.models.product import Product
from app.models.user import User
from app.models.coupon import Coupon, CouponUsage
from app.core.exceptions import NotFoundException, BadRequestException, ForbiddenException
from app.config import get_settings
from app.schemas.order import OrderCreate, OrderResponse
from app.services.pricing_service import calculate_delivery_fee, get_restaurant_location

settings = get_settings()


def _gen_order_number(db: Session) -> str:
    last = db.query(Order).order_by(Order.id.desc()).first()
    return f"#{1000 + (last.id + 1 if last else 1)}"


def _to_response(order: Order) -> OrderResponse:
    return OrderResponse(
        id=order.id, order_number=order.order_number,
        customer_id=order.customer_id, delivery_driver_id=order.delivery_driver_id,
        status=order.status, subtotal=order.subtotal, delivery_fee=order.delivery_fee,
        tax=order.tax, total=order.total, payment_method=order.payment_method,
        delivery_address=order.delivery_address, notes=order.notes,
        created_at=order.created_at, updated_at=order.updated_at,
        items=[{"id": i.id, "product_id": i.product_id, "product_name": i.product_name,
                "quantity": i.quantity, "unit_price": i.unit_price, "subtotal": i.subtotal}
               for i in order.items],
        timeline=[{"id": t.id, "status": t.status, "title": t.title,
                   "description": t.description, "timestamp": t.timestamp}
                  for t in order.timeline],
        customer_name=order.customer.full_name if order.customer else None,
        customer_phone=order.customer.phone if order.customer else None,
        driver_name=order.delivery_driver.full_name if order.delivery_driver else None,
        driver_phone=order.delivery_driver.phone if order.delivery_driver else None,
    )


def create_order(db: Session, data: OrderCreate, customer: User) -> OrderResponse:
    if not data.items:
        raise BadRequestException("El pedido debe tener al menos un item")
    valid_methods = [m.value for m in PaymentMethod]
    if data.payment_method not in valid_methods:
        raise BadRequestException(f"Método de pago inválido. Válidos: {valid_methods}")

    subtotal = 0.0
    order_items = []
    for item_data in data.items:
        product = db.query(Product).filter(Product.id == item_data.product_id).first()
        if not product:
            raise NotFoundException(f"Producto ID {item_data.product_id} no encontrado")
        if not product.is_available:
            raise BadRequestException(f"'{product.name}' no está disponible")
        item_sub = product.price * item_data.quantity
        subtotal += item_sub
        order_items.append(OrderItem(
            product_id=product.id, product_name=product.name,
            quantity=item_data.quantity, unit_price=product.price, subtotal=item_sub,
        ))

    # Calcular delivery fee basado en distancia desde el restaurante (BD).
    rlat, rlon, rname = get_restaurant_location(db)
    fee_info = calculate_delivery_fee(
        address=data.delivery_address,
        restaurant_lat=rlat,
        restaurant_lon=rlon,
        restaurant_name=rname,
    )
    delivery_fee = fee_info["fee"]
    tax = round(subtotal * settings.TAX_RATE, 2)

    # Validar y aplicar cupón si viene en el payload. Sin esto el frontend
    # mostraba un descuento al cliente que el backend nunca cobraba.
    discount = 0.0
    applied_coupon: Coupon | None = None
    if data.coupon_code:
        applied_coupon = db.query(Coupon).filter(
            Coupon.code == data.coupon_code.upper()
        ).first()
        if applied_coupon and applied_coupon.is_active:
            now = datetime.now(timezone.utc)
            expired = applied_coupon.expires_at is not None and applied_coupon.expires_at < now
            exhausted = applied_coupon.current_uses >= applied_coupon.max_uses
            below_min = subtotal < (applied_coupon.min_order_amount or 0)
            if not (expired or exhausted or below_min):
                if applied_coupon.discount_percent:
                    discount = subtotal * (applied_coupon.discount_percent / 100.0)
                elif applied_coupon.discount_amount:
                    discount = applied_coupon.discount_amount
                discount = round(discount, 2)
            else:
                applied_coupon = None
        else:
            applied_coupon = None

    total = round(max(0.0, subtotal + delivery_fee + tax - discount), 2)

    order = Order(
        order_number=_gen_order_number(db), customer_id=customer.id,
        status=OrderStatus.PENDING, subtotal=round(subtotal, 2),
        delivery_fee=delivery_fee, tax=tax, total=total,
        payment_method=data.payment_method, delivery_address=data.delivery_address,
        notes=data.notes,
    )
    order.items = order_items
    db.add(order)
    db.flush()
    db.add(OrderTimeline(order_id=order.id, status=OrderStatus.PENDING,
                         title="Pedido Confirmado", description="Tu pedido fue confirmado"))

    # Registrar uso del cupón después del flush para tener order.id disponible.
    if applied_coupon is not None and discount > 0:
        db.add(CouponUsage(
            coupon_id=applied_coupon.id,
            user_id=customer.id,
            order_id=order.id,
        ))
        applied_coupon.current_uses = (applied_coupon.current_uses or 0) + 1
        db.add(OrderTimeline(
            order_id=order.id, status=OrderStatus.PENDING,
            title="Cupón aplicado",
            description=f"{applied_coupon.code}: -S/ {discount:.2f}",
        ))

    # Auto-asignación round-robin al siguiente repartidor disponible.
    from app.services import delivery_service
    driver = delivery_service.pick_next_driver_round_robin(db)
    if driver:
        order.delivery_driver_id = driver.id
        db.add(OrderTimeline(
            order_id=order.id, status=OrderStatus.PENDING,
            title="Repartidor Asignado",
            description=f"Asignado automáticamente a {driver.full_name}",
        ))
        delivery_service.mark_driver_assigned(db, driver)

    db.commit()
    db.refresh(order)
    return _to_response(order)


def get_orders(db: Session, user: User, status: Optional[str] = None,
               skip: int = 0, limit: int = 50) -> tuple[list[OrderResponse], int]:
    query = db.query(Order).options(joinedload(Order.items), joinedload(Order.timeline))
    if user.role == "customer":
        query = query.filter(Order.customer_id == user.id)
    elif user.role == "delivery_driver":
        query = query.filter(Order.delivery_driver_id == user.id)
    if status:
        query = query.filter(Order.status == status)
    total = query.count()
    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    return [_to_response(o) for o in orders], total


def get_order_by_id(db: Session, order_id: int, user: User) -> OrderResponse:
    order = db.query(Order).options(
        joinedload(Order.items), joinedload(Order.timeline)
    ).filter(Order.id == order_id).first()
    if not order:
        raise NotFoundException("Pedido no encontrado")
    if user.role == "customer" and order.customer_id != user.id:
        raise ForbiddenException("No tienes acceso a este pedido")
    if user.role == "delivery_driver" and order.delivery_driver_id != user.id:
        raise ForbiddenException("No tienes acceso a este pedido")
    return _to_response(order)


# Estados que cada rol puede setear (independiente de la transición válida).
# El admin lleva el pedido hasta 'ready'; desde 'ready' en adelante es del repartidor.
ALLOWED_TARGET_BY_ROLE = {
    "admin": {
        OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY,
        OrderStatus.CANCELED,
    },
    "delivery_driver": {
        OrderStatus.ON_THE_WAY, OrderStatus.DELIVERED,
    },
}


def update_order_status(db: Session, order_id: int, new_status: str, user: User) -> OrderResponse:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise NotFoundException("Pedido no encontrado")
    try:
        new_enum = OrderStatus(new_status)
    except ValueError:
        raise BadRequestException(f"Estado inválido: {new_status}")

    # Permiso por rol: admin maneja hasta ready, driver maneja después.
    allowed_for_role = ALLOWED_TARGET_BY_ROLE.get(user.role, set())
    if new_enum not in allowed_for_role:
        role_label = "admin" if user.role == "admin" else "repartidor"
        raise ForbiddenException(
            f"El {role_label} no puede cambiar el estado a '{new_status}'."
        )

    # Si es repartidor, debe ser el asignado al pedido
    if user.role == "delivery_driver" and order.delivery_driver_id != user.id:
        raise ForbiddenException("No eres el repartidor asignado a este pedido")

    current = OrderStatus(order.status)
    allowed = VALID_STATUS_TRANSITIONS.get(current, [])
    if new_enum not in allowed:
        raise BadRequestException(
            f"No se puede cambiar de '{current.value}' a '{new_status}'. Válidos: {[s.value for s in allowed]}")
    order.status = new_enum
    db.add(OrderTimeline(order_id=order.id, status=new_status,
                         title=ORDER_STATUS_LABELS.get(new_enum, new_status),
                         description=f"Estado actualizado a: {ORDER_STATUS_LABELS.get(new_enum, new_status)}"))
    db.commit()
    db.refresh(order)
    return _to_response(order)


def cancel_order(db: Session, order_id: int, user: User) -> OrderResponse:
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise NotFoundException("Pedido no encontrado")
    if user.role == "customer" and order.customer_id != user.id:
        raise ForbiddenException("No puedes cancelar este pedido")
    cancelable = [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING]
    if OrderStatus(order.status) not in cancelable:
        raise BadRequestException("Solo se pueden cancelar pedidos pendientes, aceptados o en preparación")
    order.status = OrderStatus.CANCELED
    db.add(OrderTimeline(order_id=order.id, status=OrderStatus.CANCELED,
                         title="Pedido Cancelado", description=f"Cancelado por {user.full_name}"))
    db.commit()
    db.refresh(order)
    return _to_response(order)
