"""
Router de autenticación: login, registro, refresh token, perfil.
"""

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    DriverRegisterRequest,
    TokenResponse,
    RefreshTokenRequest,
)
from app.schemas.user import UserResponse
from app.services import auth_service
from app.core.dependencies import get_current_user
from app.core.rate_limit import auth_rate_limit
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=TokenResponse, dependencies=[Depends(auth_rate_limit)])
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Iniciar sesión con email y contraseña."""
    user = auth_service.authenticate_user(db, form_data.username, form_data.password)
    return auth_service.create_tokens(user)


@router.post("/login/json", response_model=TokenResponse, dependencies=[Depends(auth_rate_limit)])
def login_json(data: LoginRequest, db: Session = Depends(get_db)):
    """Iniciar sesión con JSON body (para frontend)."""
    user = auth_service.authenticate_user(db, data.email, data.password)
    return auth_service.create_tokens(user)


@router.post("/register", response_model=TokenResponse, dependencies=[Depends(auth_rate_limit)])
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """Registrar nuevo usuario (cliente por defecto)."""
    user = auth_service.register_user(db, data)
    return auth_service.create_tokens(user)


@router.post("/register-driver", response_model=TokenResponse, dependencies=[Depends(auth_rate_limit)])
def register_driver(data: DriverRegisterRequest, db: Session = Depends(get_db)):
    """Registrar nuevo repartidor (crea User + DeliveryProfile)."""
    user = auth_service.register_driver(db, data)
    return auth_service.create_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Renovar access token usando refresh token."""
    return auth_service.refresh_access_token(db, data.refresh_token)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Obtener perfil del usuario autenticado."""
    return current_user
