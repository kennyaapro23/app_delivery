"""
Servicio de usuarios.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.user import User, UserRole
from app.core.exceptions import NotFoundException
from app.schemas.user import UserUpdate, UserStatsResponse


def get_user_by_id(db: Session, user_id: int) -> User:
    """Obtiene un usuario por ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundException("Usuario no encontrado")
    return user


def get_users(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    role: Optional[str] = None,
    search: Optional[str] = None,
) -> tuple[list[User], int]:
    """Lista usuarios con filtros opcionales."""
    query = db.query(User)

    if role:
        query = query.filter(User.role == role)
    if search:
        query = query.filter(
            (User.full_name.ilike(f"%{search}%"))
            | (User.email.ilike(f"%{search}%"))
        )

    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    return users, total


def update_user(db: Session, user_id: int, data: UserUpdate) -> User:
    """Actualiza un usuario."""
    user = get_user_by_id(db, user_id)

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user


def deactivate_user(db: Session, user_id: int) -> User:
    """Desactiva un usuario."""
    user = get_user_by_id(db, user_id)
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user


def get_user_stats(db: Session) -> UserStatsResponse:
    """Obtiene estadísticas de usuarios."""
    total = db.query(User).count()
    active = db.query(User).filter(User.is_active == True).count()
    customers = db.query(User).filter(User.role == UserRole.CUSTOMER).count()
    drivers = db.query(User).filter(User.role == UserRole.DELIVERY_DRIVER).count()
    admins = db.query(User).filter(User.role == UserRole.ADMIN).count()

    one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    new_this_week = db.query(User).filter(User.created_at >= one_week_ago).count()

    return UserStatsResponse(
        total_users=total,
        active_users=active,
        customers=customers,
        drivers=drivers,
        admins=admins,
        new_this_week=new_this_week,
    )
