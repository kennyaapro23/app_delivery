"""
Chikenhot API — Food Delivery Backend
Punto de entrada de la aplicación FastAPI.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import get_settings
from app.database import engine, SessionLocal, Base


# Mini-migración idempotente: create_all() crea tablas nuevas pero NO agrega
# columnas a tablas ya existentes. Esto añade las columnas nuevas si faltan,
# para que el deploy se auto-repare sin Alembic ni ALTER manual.
_LIGHT_MIGRATIONS = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(120)",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(120)",
    "ALTER TABLE delivery_profiles ADD COLUMN IF NOT EXISTS vehicle_photo TEXT",
    "ALTER TABLE delivery_profiles ADD COLUMN IF NOT EXISTS dni_photo TEXT",
    "ALTER TABLE delivery_profiles ADD COLUMN IF NOT EXISTS last_assigned_at TIMESTAMP",
]


def _run_light_migrations():
    with engine.begin() as conn:
        for stmt in _LIGHT_MIGRATIONS:
            try:
                conn.execute(text(stmt))
            except Exception as e:  # noqa: BLE001
                print(f"⚠️  migración omitida ({stmt}): {e}")

# Importar todos los modelos para que SQLAlchemy los registre
from app.models import (  # noqa: F401
    User, Product, Category, Order, OrderItem, OrderTimeline,
    DeliveryProfile, DeliveryEarning, Address, Review, Coupon, CouponUsage,
    StoreConfig,
)

# Importar routers
from app.routers import auth, users, products, orders, delivery, addresses, reviews, coupons, dashboard, store_config

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup y shutdown events."""
    # Startup: crear tablas y seed data
    Base.metadata.create_all(bind=engine)
    _run_light_migrations()
    print("✅ Tablas de base de datos creadas/verificadas")

    # Seed data
    db = SessionLocal()
    try:
        from app.seeds.seed_data import seed_database
        seed_database(db)
    finally:
        db.close()

    yield
    # Shutdown
    print("👋 Chikenhot API cerrándose...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="🍗 API para el sistema de delivery de Chikenhot",
    lifespan=lifespan,
    # La documentación interactiva solo se expone fuera de producción.
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    openapi_url="/openapi.json" if not settings.is_production else None,
)

# CORS — orígenes explícitos (nunca "*" junto con credenciales).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Añade cabeceras de seguridad a todas las respuestas."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(self), camera=(), microphone=()"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# Registrar routers
API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(products.router, prefix=API_PREFIX)
app.include_router(orders.router, prefix=API_PREFIX)
app.include_router(delivery.router, prefix=API_PREFIX)
app.include_router(addresses.router, prefix=API_PREFIX)
app.include_router(reviews.router, prefix=API_PREFIX)
app.include_router(coupons.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)
app.include_router(store_config.router, prefix=API_PREFIX)


@app.get("/", tags=["Root"])
def root():
    """Health check."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
        "message": "🍗 Bienvenido a la API de Chikenhot!",
    }


@app.get("/health", tags=["Root"])
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
