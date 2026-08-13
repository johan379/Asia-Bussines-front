from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Producto(Base):
    """
    Productos controlados por CANTIDAD (todas las familias excepto
    "Rollos de acero", que se maneja en el modelo `Rollo` por unidad
    individual — ver documento "Prompt Rollos almacenados").
    """

    __tablename__ = "productos"

    id: Mapped[int] = mapped_column(primary_key=True)
    bodega_id: Mapped[int] = mapped_column(ForeignKey("bodegas.id"), nullable=False, index=True)

    codigo_importacion: Mapped[str] = mapped_column(String(50), default="")
    codigo: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    descripcion: Mapped[str] = mapped_column(String(255), nullable=False)
    familia: Mapped[str] = mapped_column(String(50), default="")
    calibre: Mapped[str] = mapped_column(String(30), default="")

    entrada: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    stock: Mapped[float] = mapped_column(Numeric(12, 2), default=0)

    bodega = relationship("Bodega", back_populates="productos")
