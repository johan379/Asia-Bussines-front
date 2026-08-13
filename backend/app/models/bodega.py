from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Bodega(Base):
    __tablename__ = "bodegas"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)

    usuarios = relationship("Usuario", back_populates="bodega")
    productos = relationship("Producto", back_populates="bodega")
    rollos = relationship("Rollo", back_populates="bodega")
