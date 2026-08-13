from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Produccion(Base):
    """Registro de producción — consume uno o varios rollos de un mismo
    código de clasificación, descontando metros de cada rollo por separado."""

    __tablename__ = "producciones"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo_unico: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)  # PROD-0001
    cotizacion: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)  # 001
    fecha: Mapped[DateTime] = mapped_column(DateTime(timezone=True))

    usuario: Mapped[str] = mapped_column(String(150), default="")
    responsable: Mapped[str] = mapped_column(String(150), default="")

    bodega_id: Mapped[int] = mapped_column(ForeignKey("bodegas.id"), nullable=False, index=True)

    producto_fabricado: Mapped[str] = mapped_column(String(150), default="")
    modelo: Mapped[str] = mapped_column(String(80), default="")
    medida_producto: Mapped[str] = mapped_column(String(80), default="")
    cantidad_productos: Mapped[int] = mapped_column(Integer, default=0)

    codigo_clasificacion: Mapped[str] = mapped_column(String(60), default="")
    total_metros_consumidos: Mapped[float] = mapped_column(Float, default=0)
    saldo_codigo: Mapped[float] = mapped_column(Float, default=0)
    observaciones: Mapped[str] = mapped_column(Text, default="")

    rollos_utilizados = relationship(
        "RolloUtilizadoProduccion", back_populates="produccion", cascade="all, delete-orphan"
    )


class RolloUtilizadoProduccion(Base):
    """Detalle de trazabilidad: qué rollo(s) y cuántos metros de cada uno
    se consumieron en una producción específica."""

    __tablename__ = "rollos_utilizados_produccion"

    id: Mapped[int] = mapped_column(primary_key=True)
    produccion_id: Mapped[int] = mapped_column(ForeignKey("producciones.id"), nullable=False)
    rollo_id: Mapped[int] = mapped_column(ForeignKey("rollos.id"), nullable=False)
    identificador_rollo: Mapped[str] = mapped_column(String(60), default="")
    metros_consumidos: Mapped[float] = mapped_column(Float, nullable=False)

    produccion = relationship("Produccion", back_populates="rollos_utilizados")