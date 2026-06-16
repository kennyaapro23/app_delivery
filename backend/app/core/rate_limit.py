"""
Rate limiting sencillo en memoria (ventana deslizante por IP).

Pensado para proteger endpoints sensibles (login / registro) frente a
fuerza bruta. Es un limitador *por proceso*: suficiente para desarrollo y
despliegues de una sola instancia. En producción con múltiples workers o
réplicas conviene usar un backend compartido (Redis) — ver docs/SECURITY.md.
"""

from collections import defaultdict, deque
from threading import Lock
from time import monotonic
from typing import Deque, Dict

from fastapi import Request

from app.config import get_settings
from app.core.exceptions import RateLimitException

settings = get_settings()

# IP -> timestamps (monotónicos) de las peticiones dentro de la ventana.
_hits: Dict[str, Deque[float]] = defaultdict(deque)
_lock = Lock()


def _client_ip(request: Request) -> str:
    """IP del cliente respetando el primer proxy (X-Forwarded-For)."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimiter:
    """
    Dependency de FastAPI que limita peticiones por IP.

    Uso:
        login_rate_limit = RateLimiter()
        @router.post("/login", dependencies=[Depends(login_rate_limit)])
    """

    def __init__(self, max_attempts: int | None = None, window_seconds: int | None = None):
        self.max_attempts = max_attempts or settings.AUTH_RATE_LIMIT_MAX_ATTEMPTS
        self.window = window_seconds or settings.AUTH_RATE_LIMIT_WINDOW_SECONDS

    def __call__(self, request: Request) -> None:
        ip = _client_ip(request)
        now = monotonic()
        cutoff = now - self.window

        with _lock:
            bucket = _hits[ip]
            # Descartar timestamps fuera de la ventana.
            while bucket and bucket[0] < cutoff:
                bucket.popleft()

            if len(bucket) >= self.max_attempts:
                retry_after = int(self.window - (now - bucket[0])) + 1
                raise RateLimitException(retry_after=retry_after)

            bucket.append(now)


# Limitador estándar para autenticación.
auth_rate_limit = RateLimiter()
