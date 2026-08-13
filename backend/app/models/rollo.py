import enum

from sqlalchemy import DateTime, Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class EstadoRollo(str, enum.Enum):
    CERRADO = "cerrado"   # recién ingresado, nunca usado
    ABIERTO = "abierto"   # ya usado y con metros disponibles
    AGOTADO = "agotado"   # sin metros disponibles


class Rollo(Base):
    """
    Materia prima "Rollos de acero" — se controla POR ROLLO INDIVIDUAL.
    Aunque varios rollos compartan `codigo_interno`, cada uno es un registro
    aparte con sus propios metros y estado; nunca se suman entre sí.
    """

    __tablename__ = "rollos"

    id: Mapped[int] = mapped_column(primary_key=True)
    bodega_id: Mapped[int] = mapped_column(ForeignKey("bodegas.id"), nullable=False, index=True)
    recepcion_id: Mapped[int | None] = mapped_column(ForeignKey("recepciones.id"), nullable=True)

    codigo_interno: Mapped[str] = mapped_column(String(60), index=True, nullable=False)
    identificador_rollo: Mapped[str] = mapped_column(String(60), nullable=False)
    codigo_proveedor: Mapped[str] = mapped_column(String(60), default="")
    descripcion: Mapped[str] = mapped_column(String(255), default="")
    familia: Mapped[str] = mapped_column(String(50), default="Rollos de acero")
    color_material: Mapped[str] = mapped_column(String(60), default="")
    calibre: Mapped[float] = mapped_column(Float, default=0)
    peso_neto: Mapped[float | None] = mapped_column(Float, nullable=True)

    metros_proveedor: Mapped[float] = mapped_column(Float, default=0)
    metros_calculados: Mapped[float] = mapped_column(Float, default=0)
    metros_disponibles: Mapped[float] = mapped_column(Float, default=0)
    metros_consumidos: Mapped[float] = mapped_column(Float, default=0)

    fecha_ingreso: Mapped[DateTime] = mapped_column(DateTime(timezone=True))
    estado: Mapped[EstadoRollo] = mapped_column(Enum(EstadoRollo), default=EstadoRollo.CERRADO)
    observaciones: Mapped[str] = mapped_column(Text, default="")
    proveedor: Mapped[str] = mapped_column(String(120), default="")
    lote: Mapped[str] = mapped_column(String(60), default="")

    bodega = relationship("Bodega", back_populates="rollos")
    historial_consumos = relationship(
        "HistorialConsumoRollo", back_populates="rollo", cascade="all, delete-orphan"
    )

    def recalcular_estado(self) -> None:
        """Deriva el estado a partir de los metros — nunca se asigna a mano."""
        if self.metros_consumidos <= 0:
            self.estado = EstadoRollo.CERRADO
        elif self.metros_disponibles <= 0:
            self.estado = EstadoRollo.AGOTADO
        else:
            self.estado = EstadoRollo.ABIERTO


class HistorialConsumoRollo(Base):
    __tablename__ = "historial_consumos_rollo"

    id: Mapped[int] = mapped_column(primary_key=True)
    rollo_id: Mapped[int] = mapped_column(ForeignKey("rollos.id"), nullable=False, index=True)
    fecha: Mapped[DateTime] = mapped_column(DateTime(timezone=True))
    cantidad: Mapped[float] = mapped_column(Float, nullable=False)
    usuario: Mapped[str] = mapped_column(String(150), default="")
    observaciones: Mapped[str] = mapped_column(Text, default="")

    rollo = relationship("Rollo", back_populates="historial_consumos")
