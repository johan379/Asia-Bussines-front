"""Almacenamiento temporal y compartible para el flujo de recepción."""

from app.services.almacen_temporal import AlmacenTemporal

_almacen = AlmacenTemporal(prefijo="recepcion", etiqueta_error="las recepciones temporales")

guardar = _almacen.guardar
obtener = _almacen.obtener
eliminar = _almacen.eliminar
