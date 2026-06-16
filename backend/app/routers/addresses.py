"""
Router de direcciones del cliente.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.address import AddressCreate, AddressUpdate, AddressResponse
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundException, ForbiddenException
from app.models.user import User
from app.models.address import Address

router = APIRouter(prefix="/addresses", tags=["Direcciones"])


@router.get("", response_model=list[AddressResponse])
def list_addresses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Listar direcciones del usuario."""
    return db.query(Address).filter(Address.user_id == current_user.id).all()


@router.post("", response_model=AddressResponse)
def create_address(
    data: AddressCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Agregar nueva dirección."""
    if data.is_default:
        db.query(Address).filter(
            Address.user_id == current_user.id
        ).update({"is_default": False})

    address = Address(user_id=current_user.id, **data.model_dump())
    db.add(address)
    db.commit()
    db.refresh(address)
    return address


@router.put("/{address_id}", response_model=AddressResponse)
def update_address(
    address_id: int,
    data: AddressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Actualizar dirección."""
    address = db.query(Address).filter(Address.id == address_id).first()
    if not address:
        raise NotFoundException("Dirección no encontrada")
    if address.user_id != current_user.id:
        raise ForbiddenException()

    update_data = data.model_dump(exclude_unset=True)
    if update_data.get("is_default"):
        db.query(Address).filter(
            Address.user_id == current_user.id
        ).update({"is_default": False})

    for key, value in update_data.items():
        setattr(address, key, value)
    db.commit()
    db.refresh(address)
    return address


@router.delete("/{address_id}")
def delete_address(
    address_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Eliminar dirección."""
    address = db.query(Address).filter(Address.id == address_id).first()
    if not address:
        raise NotFoundException("Dirección no encontrada")
    if address.user_id != current_user.id:
        raise ForbiddenException()
    db.delete(address)
    db.commit()
    return {"message": "Dirección eliminada"}
