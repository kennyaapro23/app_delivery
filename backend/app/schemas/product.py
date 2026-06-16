"""
Schemas de producto y categoría.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: str = "🍗"


class CategoryCreate(CategoryBase):
    display_order: int = 0


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


class CategoryResponse(CategoryBase):
    id: int
    is_active: bool
    display_order: int

    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    category_id: int
    icon: str = "🍗"
    image_url: Optional[str] = None
    is_featured: bool = False


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category_id: Optional[int] = None
    icon: Optional[str] = None
    image_url: Optional[str] = None
    is_available: Optional[bool] = None
    is_featured: Optional[bool] = None


class ProductResponse(ProductBase):
    id: int
    is_available: bool
    created_at: datetime
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    products: list[ProductResponse]
    total: int
