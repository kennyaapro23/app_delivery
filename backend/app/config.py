"""
Configuración de la aplicación.
Carga variables de entorno desde .env
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/chikenhot_db"

    # JWT
    SECRET_KEY: str = "chikenhot-dev-secret-key-cambiar-en-produccion"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # App
    APP_NAME: str = "Chikenhot API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Tax rate (Peru IGV = 18%)
    TAX_RATE: float = 0.18

    # ── Delivery pricing ──────────────────────────────────────
    # Ubicación del restaurante/punto de despacho (Lima centro por defecto).
    RESTAURANT_LATITUDE: float = -12.0464
    RESTAURANT_LONGITUDE: float = -77.0428
    RESTAURANT_NAME: str = "Chikenhot Lima Centro"

    # Tarifa: base + por_km * km, acotada por mín/máx
    DELIVERY_FEE_BASE: float = 3.00        # S/ tarifa fija inicial
    DELIVERY_FEE_PER_KM: float = 1.50      # S/ por kilómetro
    DELIVERY_FEE_MIN: float = 5.00         # S/ mínimo cobrado
    DELIVERY_FEE_MAX: float = 25.00        # S/ tope superior

    # Fallback si no se pueden parsear coordenadas
    DEFAULT_DELIVERY_FEE: float = 5.00

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
