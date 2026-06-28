"""
Router de dashboard y analytics.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import dashboard_service
from app.core.dependencies import require_admin, require_customer, require_driver, get_current_user
from app.core.exceptions import BadRequestException
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/admin")
def admin_dashboard(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Dashboard admin con estadísticas generales."""
    return dashboard_service.get_admin_dashboard(db)


@router.get("/reports")
def admin_reports(
    start_date: str | None = Query(None, description="YYYY-MM-DD (inclusive)"),
    end_date: str | None = Query(None, description="YYYY-MM-DD (inclusive)"),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Reportes analíticos del admin para un rango de fechas (por defecto, últimos 30 días)."""
    now = datetime.now(timezone.utc)
    try:
        end = (
            datetime.strptime(end_date, "%Y-%m-%d") if end_date
            else now.replace(hour=0, minute=0, second=0, microsecond=0)
        )
        start = (
            datetime.strptime(start_date, "%Y-%m-%d") if start_date
            else (end - timedelta(days=29))
        )
    except ValueError:
        raise BadRequestException("Formato de fecha inválido. Usa YYYY-MM-DD.")
    # end inclusivo: avanzamos un día para el filtro < end
    end_exclusive = end + timedelta(days=1)
    if start > end:
        raise BadRequestException("La fecha inicial no puede ser mayor que la final.")
    return dashboard_service.get_admin_reports(db, start, end_exclusive)


@router.get("/customer")
def customer_dashboard(
    customer: User = Depends(require_customer),
    db: Session = Depends(get_db),
):
    """Dashboard cliente con sus estadísticas."""
    return dashboard_service.get_customer_dashboard(db, customer)


@router.get("/driver")
def driver_dashboard(
    driver: User = Depends(require_driver),
    db: Session = Depends(get_db),
):
    """Dashboard repartidor con sus estadísticas."""
    from app.services import delivery_service
    return delivery_service.get_driver_stats(db, driver)
