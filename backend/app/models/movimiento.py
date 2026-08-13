import enum

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TipoMovimiento(str, enum.Enum):
    ENTRADA = "entrada"
    SALIDA = "salida"
    TRASLADO = "traslado"
    TRANSFERENCIA = "transferencia"  # aceptación de una solicitud entre bodegas


class Movimiento(Base):
    """Historial global de inventario — cada bodega ve solo los movimientos
    donde participó como origen o destino."""

    __tablename__ = "movimientos"

    id: Mapped[int] = mapped_column(primary_key=True)
    fecha: Mapped[DateTime] = mapped_column(DateTime(timezone=True))
    tipo: Mapped[TipoMovimiento] = mapped_column(Enum(TipoMovimiento), nullable=False)
    motivo: Mapped[str] = mapped_column(String(60), default="")

    producto_codigo: Mapped[str] = mapped_column(String(60), default="")
    producto_descripcion: Mapped[str] = mapped_column(String(255), default="")

    bodega_origen_id: Mapped[int | None] = mapped_column(ForeignKey("bodegas.id"), nullable=True)
    bodega_destino_id: Mapped[int | None] = mapped_column(ForeignKey("bodegas.id"), nullable=True)

    cantidad: Mapped[float] = mapped_column(Float, nullable=False)
    usuario: Mapped[str] = mapped_column(String(150), default="")
    observaciones: Mapped[str] = mapped_column(Text, default="")
    cotizacion: Mapped[str] = mapped_column(String(32), default="")
