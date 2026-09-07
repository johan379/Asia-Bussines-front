"""Almacenamiento temporal y compartible para el flujo de carga masiva de
rollos existentes — clave propia para no chocar con una recepción o una
carga de productos en curso del mismo usuario."""

from app.services.almacen_temporal import AlmacenTemporal

_almacen = AlmacenTemporal(prefijo="carga_rollos", etiqueta_error="la carga masiva de rollos")

guardar = _almacen.guardar
obtener = _almacen.obtener
eliminar = _almacen.eliminar
