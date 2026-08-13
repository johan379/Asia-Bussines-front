from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.movimiento import TipoMovimiento


class ProductoBase(BaseModel):
    codigo_importacion: str = ""
    codigo: str
    descripcion: str
    familia: str = ""
    calibre: str = ""
    entrada: float = 0
    stock: float = 0


class ProductoCrear(ProductoBase):
    pass


class ProductoActualizar(ProductoBase):
    pass


class ProductoResponse(ProductoBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    bodega_id: int
    rollo_id: int | None = None
    identificador_rollo: str = ""
    peso_neto: float | None = None


class MovimientoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    fecha: datetime
    tipo: TipoMovimiento
    motivo: str
    producto_codigo: str
    producto_descripcion: str
    bodega_origen_id: int | None
    bodega_destino_id: int | None
    cantidad: float
    usuario: str
    observaciones: str
    cotizacion: str = ""


class PaginaProductos(BaseModel):
    items: list[ProductoResponse]
    total: int
    pagina: int
    tamano: int
    total_paginas: int


class PaginaMovimientos(BaseModel):
    items: list[MovimientoResponse]
    total: int
    pagina: int
    tamano: int
    total_paginas: int


class FiltrosHistorial(BaseModel):
    codigo_producto: str | None = None
    fecha_desde: datetime | None = None
    fecha_hasta: datetime | None = None

class MovimientoCrear(BaseModel):
    tipo: TipoMovimiento
    motivo: str = ""
    producto_id: int
    bodega_destino_id: int | None = None
    cantidad: float
    observaciones: str = ""
