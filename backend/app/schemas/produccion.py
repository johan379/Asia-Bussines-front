from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ConsumoRolloProduccion(BaseModel):
    rollo_id: int
    metros: float = Field(gt=0)


class ProduccionCrear(BaseModel):
    producto_fabricado: str = ""
    modelo: str
    medida_producto: str
    cantidad_productos: int = Field(gt=0)
    responsable: str
    observaciones: str = ""
    rollos: list[ConsumoRolloProduccion]


class RolloUtilizadoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    rollo_id: int
    identificador_rollo: str
    metros_consumidos: float


class ProduccionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    codigo_unico: str
    cotizacion: str
    fecha: datetime
    usuario: str
    responsable: str
    bodega_id: int
    producto_fabricado: str
    modelo: str
    medida_producto: str
    cantidad_productos: int
    codigo_clasificacion: str
    total_metros_consumidos: float
    saldo_codigo: float
    observaciones: str
    rollos_utilizados: list[RolloUtilizadoResponse] = []
