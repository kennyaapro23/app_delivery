"""
Servicio de autenticación.
"""

from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.delivery import DeliveryProfile, VehicleType
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.exceptions import CredentialsException, ConflictException, BadRequestException
from app.schemas.auth import LoginRequest, RegisterRequest, DriverRegisterRequest, TokenResponse


def authenticate_user(db: Session, email: str, password: str) -> User:
    """Autentica un usuario por email y contraseña."""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise CredentialsException("Email o contraseña incorrectos")
    if not verify_password(password, user.hashed_password):
        raise CredentialsException("Email o contraseña incorrectos")
    if not user.is_active:
        raise CredentialsException("Cuenta desactivada")
    return user


def register_user(db: Session, data: RegisterRequest) -> User:
    """Registra un nuevo usuario."""
    # Verificar que el email no exista
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise ConflictException("Ya existe una cuenta con este email")

    # Validar rol
    valid_roles = [r.value for r in UserRole]
    if data.role not in valid_roles:
        raise BadRequestException(f"Rol inválido. Roles válidos: {valid_roles}")

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def register_driver(db: Session, data: DriverRegisterRequest) -> User:
    """Registra un repartidor: crea User (role=delivery_driver) + DeliveryProfile."""
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise ConflictException("Ya existe una cuenta con este email")

    # Validar vehicle_type si viene
    vehicle_enum = None
    if data.vehicle_type:
        valid = [v.value for v in VehicleType]
        if data.vehicle_type not in valid:
            raise BadRequestException(f"Tipo de vehículo inválido. Válidos: {valid}")
        vehicle_enum = VehicleType(data.vehicle_type)

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role=UserRole.DELIVERY_DRIVER,
    )
    db.add(user)
    db.flush()

    profile = DeliveryProfile(
        user_id=user.id,
        # Personales
        document_id=data.document_id,
        birth_date=data.birth_date,
        gender=data.gender,
        home_address=data.home_address,
        home_district=data.home_district,
        # Emergencia
        emergency_contact_name=data.emergency_contact_name,
        emergency_contact_phone=data.emergency_contact_phone,
        emergency_contact_relation=data.emergency_contact_relation,
        # Vehículo
        vehicle_type=vehicle_enum,
        vehicle_brand=data.vehicle_brand,
        vehicle_model=data.vehicle_model,
        vehicle_year=data.vehicle_year,
        vehicle_color=data.vehicle_color,
        vehicle_plate=data.vehicle_plate,
        license_number=data.license_number,
        license_expiry=data.license_expiry,
        insurance_number=data.insurance_number,
        insurance_expiry=data.insurance_expiry,
        # Banco
        bank_name=data.bank_name,
        bank_account_type=data.bank_account_type,
        bank_account=data.bank_account,
        bank_cci=data.bank_cci,
        bank_account_holder=data.bank_account_holder,
        is_available=False,
    )
    db.add(profile)
    db.commit()
    db.refresh(user)
    return user


def create_tokens(user: User) -> TokenResponse:
    """Crea access y refresh tokens para un usuario."""
    token_data = {"sub": str(user.id), "role": user.role}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        role=user.role,
        full_name=user.full_name,
    )


def refresh_access_token(db: Session, refresh_token: str) -> TokenResponse:
    """Genera un nuevo access token usando el refresh token."""
    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise CredentialsException("Refresh token inválido")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise CredentialsException("Usuario no encontrado o inactivo")

    return create_tokens(user)
