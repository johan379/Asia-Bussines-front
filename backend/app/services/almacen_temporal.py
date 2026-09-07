"""Almacenamiento temporal y compartible (Redis con fallback a disco) para
los flujos de carga masiva por Excel — recepción, carga de productos y carga
de rollos existentes. Cada flujo usa su propio prefijo de clave/archivo para
no chocar entre sí si el mismo usuario tiene más de uno en curso.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from functools import cached_property
from pathlib import Path
import pickle

try:
    from redis import Redis
    from redis.exceptions import RedisError
except ImportError:  # Redis solo es necesario cuando se habilita REDIS_URL.
    Redis = None  # type: ignore[assignment,misc]
    RedisError = Exception

from app.core.config import settings


class AlmacenTemporal:
    """Un espacio de almacenamiento temporal aislado, identificado por `prefijo`."""

    def __init__(self, prefijo: str, etiqueta_error: str) -> None:
        self._prefijo = prefijo
        self._etiqueta_error = etiqueta_error

    def _ruta(self, usuario_id: int) -> Path:
        carpeta = Path(settings.RECEPCIONES_TEMPORALES_DIR)
        carpeta.mkdir(parents=True, exist_ok=True)
        return carpeta / f"{self._prefijo}_usuario_{usuario_id}.pkl"

    def _clave_redis(self, usuario_id: int) -> str:
        return f"arquitejas:{self._prefijo}:{usuario_id}"

    @cached_property
    def _redis(self) -> object | None:
        if not settings.REDIS_URL:
            return None
        if Redis is None:
            raise RuntimeError("REDIS_URL está configurada, pero falta instalar la dependencia redis.")
        # Un Redis opcional caído no debe añadir varios segundos a cada paso;
        # la operación cae de inmediato al disco local.
        return Redis.from_url(
            settings.REDIS_URL,
            socket_connect_timeout=0.2,
            socket_timeout=0.2,
            retry_on_timeout=False,
        )

    def _ejecutar_en_redis(self, operacion):
        """Ejecuta una operación Redis; en desarrollo conserva el fallback local.

        Producción no debe degradar silenciosamente: varias instancias no comparten
        disco local y se perdería el estado de la carga entre solicitudes.
        """
        cliente_redis = self._redis
        if not cliente_redis:
            return False, None
        try:
            return True, operacion(cliente_redis)
        except RedisError as exc:
            if settings.es_produccion:
                raise RuntimeError(f"Redis no está disponible para {self._etiqueta_error}.") from exc
            return False, None

    def guardar(self, usuario_id: int, datos: dict) -> None:
        datos["guardado_en"] = datetime.now(timezone.utc)
        guardado_en_redis, _ = self._ejecutar_en_redis(
            lambda cliente: cliente.setex(
                self._clave_redis(usuario_id),
                timedelta(minutes=settings.RECEPCIONES_TEMPORALES_MINUTOS),
                pickle.dumps(datos),
            )
        )
        if guardado_en_redis:
            return
        with self._ruta(usuario_id).open("wb") as archivo:
            pickle.dump(datos, archivo)

    def obtener(self, usuario_id: int) -> dict | None:
        leido_de_redis, contenido = self._ejecutar_en_redis(
            lambda cliente: cliente.get(self._clave_redis(usuario_id))
        )
        if leido_de_redis:
            return pickle.loads(contenido) if contenido else None  # noqa: S301 - contenido serializado por esta aplicación.
        ruta = self._ruta(usuario_id)
        if not ruta.exists():
            return None
        with ruta.open("rb") as archivo:
            datos = pickle.load(archivo)  # noqa: S301 - archivo interno creado por esta aplicación.
        if datetime.now(timezone.utc) - datos.get("guardado_en", datetime.min.replace(tzinfo=timezone.utc)) > timedelta(minutes=settings.RECEPCIONES_TEMPORALES_MINUTOS):
            ruta.unlink(missing_ok=True)
            return None
        return datos

    def eliminar(self, usuario_id: int) -> None:
        eliminado_en_redis, _ = self._ejecutar_en_redis(
            lambda cliente: cliente.delete(self._clave_redis(usuario_id))
        )
        if eliminado_en_redis:
            return
        self._ruta(usuario_id).unlink(missing_ok=True)
