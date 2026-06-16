"""
Servicio de productos y categorías.
"""

from typing import Optional

from sqlalchemy.orm import Session

from app.models.product import Product, Category
from app.core.exceptions import NotFoundException, ConflictException
from app.schemas.product import ProductCreate, ProductUpdate, CategoryCreate


# ─── CATEGORÍAS ───────────────────────────────────────────────

def get_categories(db: Session, include_inactive: bool = False) -> list[Category]:
    """Lista categorías. Por defecto solo activas (público)."""
    q = db.query(Category)
    if not include_inactive:
        q = q.filter(Category.is_active == True)
    return q.order_by(Category.display_order, Category.id).all()


def get_category_by_id(db: Session, category_id: int) -> Category:
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise NotFoundException("Categoría no encontrada")
    return cat


def create_category(db: Session, data: CategoryCreate) -> Category:
    """Crea una nueva categoría."""
    existing = db.query(Category).filter(Category.name == data.name).first()
    if existing:
        raise ConflictException(f"La categoría '{data.name}' ya existe")

    category = Category(**data.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(db: Session, category_id: int, data) -> Category:
    """Actualiza una categoría (admin)."""
    cat = get_category_by_id(db, category_id)
    update = data.model_dump(exclude_unset=True)
    for k, v in update.items():
        setattr(cat, k, v)
    db.commit()
    db.refresh(cat)
    return cat


def delete_category(db: Session, category_id: int) -> Category:
    """Desactiva la categoría (soft delete). Si tiene productos, los desactiva también."""
    cat = get_category_by_id(db, category_id)
    cat.is_active = False
    db.query(Product).filter(Product.category_id == category_id).update(
        {"is_available": False}
    )
    db.commit()
    db.refresh(cat)
    return cat


# ─── PRODUCTOS ────────────────────────────────────────────────

def get_products(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    featured_only: bool = False,
    include_inactive: bool = False,
) -> tuple[list[Product], int]:
    """Lista productos con filtros opcionales.

    include_inactive=True hace que admin vea también los desactivados
    (para poder reactivarlos).
    """
    query = db.query(Product)
    if not include_inactive:
        query = query.filter(Product.is_available == True)

    if category_id:
        query = query.filter(Product.category_id == category_id)
    if search:
        query = query.filter(
            (Product.name.ilike(f"%{search}%"))
            | (Product.description.ilike(f"%{search}%"))
        )
    if featured_only:
        query = query.filter(Product.is_featured == True)

    total = query.count()
    products = query.order_by(Product.name).offset(skip).limit(limit).all()
    return products, total


def get_product_by_id(db: Session, product_id: int) -> Product:
    """Obtiene un producto por ID."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise NotFoundException("Producto no encontrado")
    return product


def create_product(db: Session, data: ProductCreate) -> Product:
    """Crea un nuevo producto."""
    # Verificar que la categoría existe
    category = db.query(Category).filter(Category.id == data.category_id).first()
    if not category:
        raise NotFoundException("Categoría no encontrada")

    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def update_product(db: Session, product_id: int, data: ProductUpdate) -> Product:
    """Actualiza un producto."""
    product = get_product_by_id(db, product_id)

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product_id: int) -> Product:
    """Desactiva un producto (soft delete)."""
    product = get_product_by_id(db, product_id)
    product.is_available = False
    db.commit()
    db.refresh(product)
    return product
