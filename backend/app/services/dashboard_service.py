"""
Servicio de dashboard y analytics.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session
from sqlalchemy import func, case

from app.models.order import Order, OrderStatus, OrderItem
from app.models.user import User, UserRole
from app.models.delivery import DeliveryProfile


def _enum_val(v):
    return v.value if hasattr(v, "value") else v


def get_admin_reports(db: Session, start: datetime, end: datetime) -> dict:
    """Reportes analíticos para un rango [start, end). Solo admin.

    Devuelve resumen, serie diaria, top productos, top clientes y desgloses
    por estado y método de pago. Los ingresos excluyen pedidos cancelados.
    """
    in_range = (Order.created_at >= start, Order.created_at < end)
    not_canceled = Order.status != OrderStatus.CANCELED

    total_orders = db.query(Order).filter(*in_range).count()
    delivered = db.query(Order).filter(*in_range, Order.status == OrderStatus.DELIVERED).count()
    canceled = db.query(Order).filter(*in_range, Order.status == OrderStatus.CANCELED).count()
    revenue = float(
        db.query(func.coalesce(func.sum(Order.total), 0.0))
        .filter(*in_range, not_canceled).scalar()
    )
    paying_orders = max(total_orders - canceled, 0)
    avg_ticket = round(revenue / paying_orders, 2) if paying_orders else 0.0

    # Serie diaria (pedidos e ingresos por día)
    revenue_expr = func.coalesce(
        func.sum(case((not_canceled, Order.total), else_=0.0)), 0.0
    )
    daily_rows = (
        db.query(func.date(Order.created_at).label("d"), func.count(Order.id), revenue_expr)
        .filter(*in_range)
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
        .all()
    )
    daily = [
        {"date": str(d), "orders": int(c), "revenue": round(float(r), 2)}
        for d, c, r in daily_rows
    ]

    # Top productos (por unidades vendidas)
    tp = (
        db.query(
            OrderItem.product_id,
            OrderItem.product_name,
            func.coalesce(func.sum(OrderItem.quantity), 0),
            func.coalesce(func.sum(OrderItem.subtotal), 0.0),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .filter(*in_range, not_canceled)
        .group_by(OrderItem.product_id, OrderItem.product_name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(10)
        .all()
    )
    top_products = [
        {"product_id": pid, "name": name, "qty": int(qty), "revenue": round(float(rev), 2)}
        for pid, name, qty, rev in tp
    ]

    # Top clientes (por número de pedidos y gasto)
    tc = (
        db.query(
            User.id,
            User.full_name,
            func.count(Order.id),
            func.coalesce(func.sum(Order.total), 0.0),
        )
        .join(Order, Order.customer_id == User.id)
        .filter(*in_range, not_canceled)
        .group_by(User.id, User.full_name)
        .order_by(func.count(Order.id).desc())
        .limit(10)
        .all()
    )
    top_customers = [
        {"user_id": uid, "name": name, "orders": int(n), "spend": round(float(s), 2)}
        for uid, name, n, s in tc
    ]

    # Desglose por estado
    bs = (
        db.query(Order.status, func.count(Order.id))
        .filter(*in_range)
        .group_by(Order.status)
        .all()
    )
    by_status = [{"status": _enum_val(s), "count": int(c)} for s, c in bs]

    # Desglose por método de pago (ingresos)
    bp = (
        db.query(Order.payment_method, func.count(Order.id), func.coalesce(func.sum(Order.total), 0.0))
        .filter(*in_range, not_canceled)
        .group_by(Order.payment_method)
        .all()
    )
    by_payment = [
        {"method": _enum_val(m), "count": int(c), "revenue": round(float(r), 2)}
        for m, c, r in bp
    ]

    return {
        "range": {"start": start.date().isoformat(), "end": (end - timedelta(days=1)).date().isoformat()},
        "summary": {
            "orders": total_orders,
            "delivered": delivered,
            "canceled": canceled,
            "revenue": round(revenue, 2),
            "avg_ticket": avg_ticket,
        },
        "daily": daily,
        "top_products": top_products,
        "top_customers": top_customers,
        "by_status": by_status,
        "by_payment": by_payment,
    }


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
