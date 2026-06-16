"""
Servicio de dashboard y analytics.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.order import Order, OrderStatus
from app.models.user import User, UserRole
from app.models.delivery import DeliveryProfile


def get_admin_dashboard(db: Session) -> dict:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)

    # Pedidos hoy
    orders_today = db.query(Order).filter(Order.created_at >= today_start).count()
    orders_yesterday = db.query(Order).filter(
        Order.created_at >= yesterday_start, Order.created_at < today_start
    ).count()

    # Ingresos hoy
    revenue_today = float(
        db.query(func.coalesce(func.sum(Order.total), 0.0))
        .filter(Order.created_at >= today_start, Order.status != OrderStatus.CANCELED)
        .scalar()
    )
    revenue_yesterday = float(
        db.query(func.coalesce(func.sum(Order.total), 0.0))
        .filter(Order.created_at >= yesterday_start, Order.created_at < today_start,
                Order.status != OrderStatus.CANCELED)
        .scalar()
    )

    # Usuarios activos
    active_users = db.query(User).filter(User.is_active == True).count()

    # Repartidores
    total_drivers = db.query(DeliveryProfile).count()
    available_drivers = db.query(DeliveryProfile).filter(
        DeliveryProfile.is_available == True
    ).count()

    # Pedidos pendientes
    pending_orders = db.query(Order).filter(
        Order.status.in_([OrderStatus.PENDING, OrderStatus.ACCEPTED])
    ).count()

    # Calcular porcentajes de cambio
    orders_change = (
        round((orders_today - orders_yesterday) / max(orders_yesterday, 1) * 100)
        if orders_yesterday > 0 else 0
    )
    revenue_change = (
        round((revenue_today - revenue_yesterday) / max(revenue_yesterday, 1) * 100)
        if revenue_yesterday > 0 else 0
    )

    return {
        "orders_today": orders_today,
        "orders_change_percent": orders_change,
        "revenue_today": revenue_today,
        "revenue_change_percent": revenue_change,
        "active_users": active_users,
        "total_drivers": total_drivers,
        "available_drivers": available_drivers,
        "pending_orders": pending_orders,
    }


def get_customer_dashboard(db: Session, user: User) -> dict:
    total_orders = db.query(Order).filter(Order.customer_id == user.id).count()
    last_order = (
        db.query(Order).filter(Order.customer_id == user.id)
        .order_by(Order.created_at.desc()).first()
    )
    active_orders = (
        db.query(Order).filter(
            Order.customer_id == user.id,
            Order.status.notin_([OrderStatus.DELIVERED, OrderStatus.CANCELED]),
        ).count()
    )

    return {
        "total_orders": total_orders,
        "active_orders": active_orders,
        "points": user.points,
        "membership_level": user.membership_level,
        "last_order_total": last_order.total if last_order else 0,
        "last_order_date": last_order.created_at.isoformat() if last_order else None,
    }
