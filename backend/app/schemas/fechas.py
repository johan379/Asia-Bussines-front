"""Serialización consistente de fechas para clientes web."""

from datetime import datetime, timezone

from pydantic import BaseModel, field_serializer


class ModeloConFechasUtc(BaseModel):
    """MySQL puede devolver DATETIME sin zona; en esta app se guarda en UTC."""

    @field_serializer("fecha", "fecha_ingreso", check_fields=False, when_used="json")
    def serializar_fecha_utc(self, valor: datetime) -> str:
        if valor.tzinfo is None:
            valor = valor.replace(tzinfo=timezone.utc)
        return valor.isoformat().replace("+00:00", "Z")
