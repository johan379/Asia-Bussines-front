"""Almacenamiento temporal y compartible para el flujo de carga masiva de
productos generales — clave propia para no chocar con una recepción de
rollos en curso del mismo usuario."""

from app.services.almacen_temporal import AlmacenTemporal

_almacen = AlmacenTemporal(prefijo="carga_productos", etiqueta_error="la carga masiva de productos")

guardar = _almacen.guardar
obtener = _almacen.obtener
eliminar = _almacen.eliminar
