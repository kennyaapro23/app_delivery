"""
Router de dashboard y analytics.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import dashboard_service
from app.core.dependencies import require_admin, require_customer, require_driver, get_current_user
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/admin")
def admin_dashboard(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Dashboard admin con estadísticas generales."""
    return dashboard_service.get_admin_dashboard(db)


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
