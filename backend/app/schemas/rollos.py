from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.rollo import EstadoRollo


class HistorialConsumoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    fecha: datetime
    cantidad: float
    usuario: str
    observaciones: str


class RolloResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    bodega_id: int
    codigo_interno: str
    identificador_rollo: str
    codigo_proveedor: str
    descripcion: str
    familia: str
    color_material: str
    calibre: float
    peso_neto: float | None
    metros_proveedor: float
    metros_calculados: float
    metros_disponibles: float
    metros_consumidos: float
    fecha_ingreso: datetime
    estado: EstadoRollo
    observaciones: str
    proveedor: str
    lote: str
    historial_consumos: list[HistorialConsumoResponse] = []


class PaginaRollos(BaseModel):
    items: list[RolloResponse]
    total: int
    pagina: int
    tamano: int
    total_paginas: int


class ConsumoRolloCrear(BaseModel):
    cantidad: float
    observaciones: str = ""


class ActualizarObservacionesRollo(BaseModel):
    observaciones: str


class FiltrosRollos(BaseModel):
    codigo_interno: str | None = None
    codigo_proveedor: str | None = None
    descripcion: str | None = None
    familia: str | None = None
    color_material: str | None = None
    calibre: str | None = None
    estado: EstadoRollo | None = None
    fecha_desde: datetime | None = None
    fecha_hasta: datetime | None = None
