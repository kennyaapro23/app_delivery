"""
Excepciones HTTP personalizadas.
"""

from fastapi import HTTPException, status


class CredentialsException(HTTPException):
    """Error 401: credenciales inválidas o token expirado."""

    def __init__(self, detail: str = "No se pudieron validar las credenciales"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class ForbiddenException(HTTPException):
    """Error 403: sin permisos suficientes."""

    def __init__(self, detail: str = "No tienes permisos para esta acción"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )


class NotFoundException(HTTPException):
    """Error 404: recurso no encontrado."""

    def __init__(self, detail: str = "Recurso no encontrado"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
        )


class BadRequestException(HTTPException):
    """Error 400: solicitud inválida."""

    def __init__(self, detail: str = "Solicitud inválida"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )


class ConflictException(HTTPException):
    """Error 409: conflicto (por ejemplo, email duplicado)."""

    def __init__(self, detail: str = "El recurso ya existe"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
        )
