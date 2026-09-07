from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.fechas import ModeloConFechasUtc

from app.models.solicitud import EstadoSolicitud, TipoOperacionSolicitud


class BodegaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str


class BodegaCrear(BaseModel):
    nombre: str


class SolicitudCrear(BaseModel):
    producto_id: int | None = None
    rollo_id: int | None = None
    cantidad: float | None = None
    tipo_operacion: TipoOperacionSolicitud = TipoOperacionSolicitud.SOLICITUD
    observaciones: str = ""


class SolicitudResponse(ModeloConFechasUtc):
    model_config = ConfigDict(from_attributes=True)
    id: int
    fecha: datetime
    estado: EstadoSolicitud
    tipo_operacion: TipoOperacionSolicitud
    cantidad: float
    producto_codigo: str
    producto_descripcion: str
    rollo_id: int | None = None
    bodega_solicitante_id: int
    bodega_propietaria_id: int
    solicitado_por: str
    observaciones: str
