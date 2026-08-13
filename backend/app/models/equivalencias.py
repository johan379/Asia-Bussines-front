from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TablaColorEquivalencia(Base):
    """RAL del proveedor -> nombre + código interno (inicial del nombre)."""

    __tablename__ = "tabla_colores_equivalencia"

    id: Mapped[int] = mapped_column(primary_key=True)
    ral: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(60), nullable=False)
    codigo_interno: Mapped[str] = mapped_column(String(10), nullable=False)


class TablaTipoMaterialEquivalencia(Base):
    __tablename__ = "tabla_tipos_material_equivalencia"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    codigo_interno: Mapped[str] = mapped_column(String(10), nullable=False)


class TablaEspesorEquivalencia(Base):
    """Espesor -> metros por tonelada y peso por metro (ambos equivalentes)."""

    __tablename__ = "tabla_espesor_equivalencia"

    id: Mapped[int] = mapped_column(primary_key=True)
    espesor: Mapped[float] = mapped_column(Float, unique=True, nullable=False)
    mt_por_ton: Mapped[float] = mapped_column(Float, nullable=False)
    peso_por_metro: Mapped[float] = mapped_column(Float, nullable=False)
