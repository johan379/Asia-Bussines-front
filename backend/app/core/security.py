"""Hashing de contraseñas y emisión/verificación de tokens JWT."""

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

_contexto_hash = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hashear_contrasena(contrasena_plana: str) -> str:
    return _contexto_hash.hash(contrasena_plana)


def verificar_contrasena(contrasena_plana: str, hash_guardado: str) -> bool:
    return _contexto_hash.verify(contrasena_plana, hash_guardado)


def crear_token_acceso(datos: dict[str, Any]) -> str:
    a_codificar = datos.copy()
    expira = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    a_codificar["exp"] = expira
    return jwt.encode(a_codificar, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decodificar_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
