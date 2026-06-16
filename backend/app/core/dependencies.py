"""
Dependencies de FastAPI para autenticación y control de acceso basado en roles.
"""

from typing import List

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import decode_token
from app.core.exceptions import CredentialsException, ForbiddenException
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Obtiene el usuario actual a partir del JWT token."""
    payload = decode_token(token)
    if payload is None:
        raise CredentialsException()

    user_id: str = payload.get("sub")
    if user_id is None:
        raise CredentialsException()

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise CredentialsException("Usuario no encontrado")

    if not user.is_active:
        raise CredentialsException("Usuario desactivado")

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Verifica que el usuario esté activo."""
    if not current_user.is_active:
        raise ForbiddenException("Usuario inactivo")
    return current_user


class RoleChecker:
    """
    Dependency class para verificar roles.
    Uso: Depends(RoleChecker(["admin"]))
    """

    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in self.allowed_roles:
            raise ForbiddenException(
                f"Se requiere rol: {', '.join(self.allowed_roles)}"
            )
        return current_user


# Shortcuts para uso común
require_admin = RoleChecker(["admin"])
require_customer = RoleChecker(["customer"])
require_driver = RoleChecker(["delivery_driver"])
require_admin_or_driver = RoleChecker(["admin", "delivery_driver"])
