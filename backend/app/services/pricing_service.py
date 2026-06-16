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
    """Extrae (lat, lon) de un delivery_address con sufijo '(lat, lon)'."""
    if not address:
        return None
    m = _COORDS_RE.search(address)
    if not m:
        return None
    return float(m.group(1)), float(m.group(2))


def calculate_delivery_fee(
    destination_lat: Optional[float] = None,
    destination_lon: Optional[float] = None,
    address: Optional[str] = None,
) -> dict:
    """Calcula la tarifa de delivery basada en distancia.

    Acepta (lat, lon) directos o un address con coords embebidas.
    Devuelve un dict con todos los datos del cálculo (para mostrar al cliente).
    """
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
                "name": settings.RESTAURANT_NAME,
                "latitude": settings.RESTAURANT_LATITUDE,
                "longitude": settings.RESTAURANT_LONGITUDE,
            },
            "note": "Tarifa por defecto: no se pudo determinar la ubicación.",
        }

    distance_km = haversine_km(
        settings.RESTAURANT_LATITUDE,
        settings.RESTAURANT_LONGITUDE,
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
            "name": settings.RESTAURANT_NAME,
            "latitude": settings.RESTAURANT_LATITUDE,
            "longitude": settings.RESTAURANT_LONGITUDE,
        },
        "note": (
            f"S/ {base:.2f} base + {distance_km:.2f} km × S/ {per_km:.2f}"
        ),
    }
