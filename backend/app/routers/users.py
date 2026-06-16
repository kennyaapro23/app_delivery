"""
Router de usuarios (CRUD admin).
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import UserResponse, UserListResponse, UserUpdate, UserStatsResponse
from app.services import user_service
from app.core.dependencies import require_admin, get_current_user
from app.models.user import User

router = APIRouter(prefix="/users", tags=["Usuarios"])


@router.get("/stats", response_model=UserStatsResponse)
def get_user_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Estadísticas de usuarios (solo admin)."""
    return user_service.get_user_stats(db)


@router.get("", response_model=UserListResponse)
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    role: Optional[str] = None,
    search: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Listar usuarios con filtros (solo admin)."""
    users, total = user_service.get_users(db, skip, limit, role, search)
    return UserListResponse(users=users, total=total)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Obtener usuario por ID (solo admin)."""
    return user_service.get_user_by_id(db, user_id)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Actualizar usuario (admin o el mismo usuario)."""
    if current_user.role != "admin" and current_user.id != user_id:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Solo puedes editar tu propio perfil")
    return user_service.update_user(db, user_id, data)


@router.delete("/{user_id}", response_model=UserResponse)
def deactivate_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Desactivar usuario (solo admin)."""
    return user_service.deactivate_user(db, user_id)
