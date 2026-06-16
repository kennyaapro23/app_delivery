"""
Router de productos y categorías.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.product import (
    ProductResponse, ProductListResponse, ProductCreate, ProductUpdate,
    CategoryResponse, CategoryCreate, CategoryUpdate,
)
from app.services import product_service
from app.core.dependencies import require_admin, get_current_user
from app.models.user import User

router = APIRouter(prefix="/products", tags=["Productos"])


# ─── CATEGORÍAS ───────────────────────────────────────────────

@router.get("/categories", response_model=list[CategoryResponse])
def list_categories(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
):
    """Listar categorías. include_inactive=true devuelve también las desactivadas (admin)."""
    return product_service.get_categories(db, include_inactive=include_inactive)


@router.post("/categories", response_model=CategoryResponse)
def create_category(
    data: CategoryCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Crear categoría (solo admin)."""
    return product_service.create_category(db, data)


@router.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    data: CategoryUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Actualizar categoría (solo admin)."""
    return product_service.update_category(db, category_id, data)


@router.delete("/categories/{category_id}", response_model=CategoryResponse)
def delete_category(
    category_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Desactivar categoría (también desactiva sus productos)."""
    return product_service.delete_category(db, category_id)


# ─── PRODUCTOS ────────────────────────────────────────────────

@router.get("", response_model=ProductListResponse)
def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    featured: bool = False,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
):
    """Listar productos con filtros.

    include_inactive=true permite que admin vea también los desactivados
    (para reactivarlos).
    """
    products, total = product_service.get_products(
        db, skip, limit, category_id, search, featured, include_inactive
    )
    return ProductListResponse(products=products, total=total)


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Obtener producto por ID (público)."""
    return product_service.get_product_by_id(db, product_id)


@router.post("", response_model=ProductResponse)
def create_product(
    data: ProductCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Crear producto (solo admin)."""
    return product_service.create_product(db, data)


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    data: ProductUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Actualizar producto (solo admin)."""
    return product_service.update_product(db, product_id, data)


@router.delete("/{product_id}", response_model=ProductResponse)
def delete_product(
    product_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Desactivar producto (solo admin)."""
    return product_service.delete_product(db, product_id)
