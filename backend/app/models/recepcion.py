from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Recepcion(Base):
    """Cabecera de cada recepción de material confirmada. El detalle por
    rollo queda en la tabla `rollos` (columna recepcion_id)."""

    __tablename__ = "recepciones"

    id: Mapped[int] = mapped_column(primary_key=True)
    fecha: Mapped[DateTime] = mapped_column(DateTime(timezone=True))
    # NULL = recepción registrada por Admin Inventario (aún sin repartir a sede).
    bodega_id: Mapped[int | None] = mapped_column(ForeignKey("bodegas.id"), nullable=True, index=True)

    encargado: Mapped[str] = mapped_column(String(150), default="")
    proveedor: Mapped[str] = mapped_column(String(150), default="")
    archivo_origen: Mapped[str] = mapped_column(String(255), default="")
    tolerancia_porcentaje: Mapped[float] = mapped_column(Float, default=2)
    estado: Mapped[str] = mapped_column(String(40), default="registrada_en_inventario")
