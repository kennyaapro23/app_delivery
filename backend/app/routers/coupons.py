"""
Router de cupones.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database import get_db
from app.schemas.coupon import CouponCreate, CouponResponse, ApplyCouponRequest, ApplyCouponResponse
from app.core.dependencies import get_current_user, require_admin
from app.core.exceptions import NotFoundException
from app.models.user import User
from app.models.coupon import Coupon, CouponUsage

router = APIRouter(prefix="/coupons", tags=["Cupones"])


@router.get("", response_model=list[CouponResponse])
def list_coupons(db: Session = Depends(get_db)):
    """Listar cupones activos."""
    now = datetime.now(timezone.utc)
    coupons = db.query(Coupon).filter(
        Coupon.is_active == True,
        (Coupon.expires_at == None) | (Coupon.expires_at > now),
    ).all()
    return coupons


@router.post("", response_model=CouponResponse)
def create_coupon(
    data: CouponCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Crear cupón (solo admin)."""
    coupon = Coupon(**data.model_dump())
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon


@router.post("/apply", response_model=ApplyCouponResponse)
def apply_coupon(
    data: ApplyCouponRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Validar y calcular descuento de un cupón."""
    coupon = db.query(Coupon).filter(Coupon.code == data.code.upper()).first()
    if not coupon:
        return ApplyCouponResponse(valid=False, discount=0, message="Cupón no encontrado")
    if not coupon.is_active:
        return ApplyCouponResponse(valid=False, discount=0, message="Cupón inactivo")
    if coupon.expires_at and coupon.expires_at < datetime.now(timezone.utc):
        return ApplyCouponResponse(valid=False, discount=0, message="Cupón expirado")
    if coupon.current_uses >= coupon.max_uses:
        return ApplyCouponResponse(valid=False, discount=0, message="Cupón agotado")
    if data.order_subtotal < coupon.min_order_amount:
        return ApplyCouponResponse(
            valid=False, discount=0,
            message=f"El pedido mínimo es S/ {coupon.min_order_amount:.2f}",
        )

    discount = 0.0
    if coupon.discount_percent:
        discount = data.order_subtotal * (coupon.discount_percent / 100)
    elif coupon.discount_amount:
        discount = coupon.discount_amount

    return ApplyCouponResponse(
        valid=True, discount=round(discount, 2),
        message=f"Cupón aplicado: -S/ {discount:.2f}",
    )
