"""
Router de reseñas.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.review import ReviewCreate, ReviewResponse
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundException, BadRequestException
from app.models.user import User
from app.models.review import Review
from app.models.order import Order, OrderStatus

router = APIRouter(prefix="/reviews", tags=["Reseñas"])


@router.post("", response_model=ReviewResponse)
def create_review(
    data: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Crear reseña para un pedido entregado."""
    order = db.query(Order).filter(Order.id == data.order_id).first()
    if not order:
        raise NotFoundException("Pedido no encontrado")
    if order.customer_id != current_user.id:
        raise BadRequestException("Solo puedes reseñar tus propios pedidos")
    if order.status != OrderStatus.DELIVERED:
        raise BadRequestException("Solo puedes reseñar pedidos entregados")

    existing = db.query(Review).filter(Review.order_id == data.order_id).first()
    if existing:
        raise BadRequestException("Ya existe una reseña para este pedido")

    review = Review(
        order_id=data.order_id, customer_id=current_user.id,
        driver_id=order.delivery_driver_id,
        rating=data.rating, comment=data.comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return ReviewResponse(
        id=review.id, order_id=review.order_id, customer_id=review.customer_id,
        driver_id=review.driver_id, rating=review.rating, comment=review.comment,
        created_at=review.created_at, customer_name=current_user.full_name,
    )


@router.get("/my", response_model=list[ReviewResponse])
def my_reviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mis reseñas."""
    reviews = db.query(Review).filter(Review.customer_id == current_user.id).all()
    return [
        ReviewResponse(
            id=r.id, order_id=r.order_id, customer_id=r.customer_id,
            driver_id=r.driver_id, rating=r.rating, comment=r.comment,
            created_at=r.created_at, customer_name=current_user.full_name,
        )
        for r in reviews
    ]


@router.get("/driver/{driver_id}", response_model=list[ReviewResponse])
def driver_reviews(driver_id: int, db: Session = Depends(get_db)):
    """Reseñas de un repartidor (público)."""
    reviews = db.query(Review).filter(Review.driver_id == driver_id).all()
    return [
        ReviewResponse(
            id=r.id, order_id=r.order_id, customer_id=r.customer_id,
            driver_id=r.driver_id, rating=r.rating, comment=r.comment,
            created_at=r.created_at,
        )
        for r in reviews
    ]
