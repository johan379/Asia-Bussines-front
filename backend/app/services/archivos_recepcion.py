"""Almacenamiento temporal y compartible para el flujo de recepción."""

from datetime import datetime, timedelta, timezone
from pathlib import Path
import pickle

from app.core.config import settings


def _ruta(usuario_id: int) -> Path:
    carpeta = Path(settings.RECEPCIONES_TEMPORALES_DIR)
    carpeta.mkdir(parents=True, exist_ok=True)
    return carpeta / f"recepcion_usuario_{usuario_id}.pkl"


def guardar(usuario_id: int, datos: dict) -> None:
    datos["guardado_en"] = datetime.now(timezone.utc)
    with _ruta(usuario_id).open("wb") as archivo:
        pickle.dump(datos, archivo)


def obtener(usuario_id: int) -> dict | None:
    ruta = _ruta(usuario_id)
    if not ruta.exists(): return None
    with ruta.open("rb") as archivo:
        datos = pickle.load(archivo)  # noqa: S301 - archivo interno creado por esta aplicación.
    if datetime.now(timezone.utc) - datos.get("guardado_en", datetime.min.replace(tzinfo=timezone.utc)) > timedelta(minutes=settings.RECEPCIONES_TEMPORALES_MINUTOS):
        ruta.unlink(missing_ok=True)
        return None
    return datos


def eliminar(usuario_id: int) -> None:
    _ruta(usuario_id).unlink(missing_ok=True)
