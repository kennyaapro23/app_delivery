"""
Servicio de cálculo de tarifas de delivery basadas en distancia.
"""

import math
import re
from typing import Optional

from app.config import get_settings

settings = get_settings()

# Coords embebidas al final del delivery_address: "texto — (lat, lon)"
_COORDS_RE = re.compile(r"\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)")


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distancia en km entre dos puntos GPS (fórmula Haversine)."""
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def extract_coords(address: str) -> Optional[tuple[float, float]]:
    """Extrae (lat, lon) de un delivery_address con sufijo '(lat, lon)'.

    Las coords reales se emiten SIEMPRE al final del string (web y app móvil).
    Tomamos la ÚLTIMA coincidencia para que un par '(decimal, decimal)' escrito
    por el usuario en la dirección/referencia (p.ej. 'alt. (12.5, 3.0)') no se
    interprete como destino en lugar de las coords reales del sufijo.
    """
    if not address:
        return None
    matches = _COORDS_RE.findall(address)
    if not matches:
        return None
    lat, lon = matches[-1]
    return float(lat), float(lon)


def get_restaurant_location(db) -> tuple[float, float, str]:
    """Ubicación del restaurante desde StoreConfig (fallback a settings).

    Permite que el admin fije el punto de despacho desde la app sin redeploy.
    Si no hay fila o falla la consulta, usa los valores por defecto de config.
    """
    try:
        from app.models.store_config import StoreConfig
        cfg = db.query(StoreConfig).filter(StoreConfig.id == 1).first()
        if cfg and cfg.latitude is not None and cfg.longitude is not None:
            return cfg.latitude, cfg.longitude, cfg.name
    except Exception:
        pass
    return (
        settings.RESTAURANT_LATITUDE,
        settings.RESTAURANT_LONGITUDE,
        settings.RESTAURANT_NAME,
    )


def calculate_delivery_fee(
    destination_lat: Optional[float] = None,
    destination_lon: Optional[float] = None,
    address: Optional[str] = None,
    restaurant_lat: Optional[float] = None,
    restaurant_lon: Optional[float] = None,
    restaurant_name: Optional[str] = None,
) -> dict:
    """Calcula la tarifa de delivery basada en distancia.

    Acepta (lat, lon) directos o un address con coords embebidas. La ubicación
    del restaurante puede inyectarse (desde StoreConfig); si no, usa settings.
    Devuelve un dict con todos los datos del cálculo (para mostrar al cliente).
    """
    # Ubicación del restaurante (inyectada desde BD o fallback a config).
    r_lat = restaurant_lat if restaurant_lat is not None else settings.RESTAURANT_LATITUDE
    r_lon = restaurant_lon if restaurant_lon is not None else settings.RESTAURANT_LONGITUDE
    r_name = restaurant_name or settings.RESTAURANT_NAME

    # Resolver coordenadas
    if destination_lat is None or destination_lon is None:
        coords = extract_coords(address or "")
        if coords:
            destination_lat, destination_lon = coords

    base = settings.DELIVERY_FEE_BASE
    per_km = settings.DELIVERY_FEE_PER_KM
    fee_min = settings.DELIVERY_FEE_MIN
    fee_max = settings.DELIVERY_FEE_MAX

    if destination_lat is None or destination_lon is None:
        # Sin coords, devolvemos el fallback
        return {
            "fee": settings.DEFAULT_DELIVERY_FEE,
            "distance_km": None,
            "base": base,
            "per_km": per_km,
            "min": fee_min,
            "max": fee_max,
            "restaurant": {
                "name": r_name,
                "latitude": r_lat,
                "longitude": r_lon,
            },
            "note": "Tarifa por defecto: no se pudo determinar la ubicación.",
        }

    distance_km = haversine_km(
        r_lat,
        r_lon,
        destination_lat,
        destination_lon,
    )

    raw_fee = base + per_km * distance_km
    fee = round(max(fee_min, min(fee_max, raw_fee)), 2)

    return {
        "fee": fee,
        "distance_km": round(distance_km, 2),
        "base": base,
        "per_km": per_km,
        "min": fee_min,
        "max": fee_max,
        "raw_fee": round(raw_fee, 2),
        "restaurant": {
            "name": r_name,
            "latitude": r_lat,
            "longitude": r_lon,
        },
        "note": (
            f"S/ {base:.2f} base + {distance_km:.2f} km × S/ {per_km:.2f}"
        ),
    }
