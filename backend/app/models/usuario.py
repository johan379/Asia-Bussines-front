import enum

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RolUsuario(str, enum.Enum):
    JEFE_PLANTA = "jefe_planta"
    ADMINISTRATIVO = "administrativo"


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    correo: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    contrasena_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rol: Mapped[RolUsuario] = mapped_column(Enum(RolUsuario), nullable=False)

    bodega_id: Mapped[int] = mapped_column(ForeignKey("bodegas.id"), nullable=False)
    bodega = relationship("Bodega", back_populates="usuarios")
