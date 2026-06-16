"""
Configuración de la aplicación.
Carga variables de entorno desde .env
"""

from functools import lru_cache
from typing import List

from pydantic import model_validator
from pydantic_settings import BaseSettings

# Valor centinela: si SECRET_KEY conserva este valor en producción, la app aborta.
INSECURE_DEFAULT_SECRET = "chikenhot-dev-secret-key-cambiar-en-produccion"


class Settings(BaseSettings):
    # ── Entorno ───────────────────────────────────────────────
    # "development" | "production". Controla validaciones de seguridad,
    # exposición de /docs y políticas de CORS.
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/chikenhot_db"

    # JWT
    SECRET_KEY: str = INSECURE_DEFAULT_SECRET
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── CORS ──────────────────────────────────────────────────
    # Lista de orígenes permitidos separados por coma. Con credenciales
    # activadas NO se permite el comodín "*"; deben declararse explícitos.
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # App
    APP_NAME: str = "Chikenhot API"
    APP_VERSION: str = "1.0.0"

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

    # ── Rate limiting (login / registro) ──────────────────────
    AUTH_RATE_LIMIT_MAX_ATTEMPTS: int = 10   # intentos permitidos…
    AUTH_RATE_LIMIT_WINDOW_SECONDS: int = 60  # …por ventana de tiempo (por IP)

    class Config:
        env_file = ".env"
        case_sensitive = True

    # ── Derivados ─────────────────────────────────────────────
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.strip().lower() == "production"

    @property
    def cors_origins_list(self) -> List[str]:
        """CORS_ORIGINS como lista, ignorando espacios y valores vacíos."""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    # ── Validaciones de seguridad al arrancar ─────────────────
    @model_validator(mode="after")
    def _enforce_production_security(self) -> "Settings":
        if self.is_production:
            if self.SECRET_KEY == INSECURE_DEFAULT_SECRET or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "SECRET_KEY inseguro en producción. Genera uno fuerte: "
                    'python -c "import secrets; print(secrets.token_urlsafe(48))"'
                )
            if self.DEBUG:
                raise ValueError("DEBUG debe ser False en producción.")
            if "*" in self.cors_origins_list:
                raise ValueError(
                    "CORS_ORIGINS no puede ser '*' en producción; declara orígenes explícitos."
                )
        return self


@lru_cache()
def get_settings() -> Settings:
    return Settings()
