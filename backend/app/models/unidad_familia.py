from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TablaUnidadFamilia(Base):
    """Unidad de medida por familia de `Producto` (ej. "Tornillos" -> "unidades",
    "Fibra de vidrio" -> "metros"). Tabla de referencia global (no por bodega),
    igual que las tablas de equivalencias de Recepción — `Producto.familia`
    sigue siendo texto libre, esto solo resuelve qué unidad mostrar junto a
    la cantidad. Si una familia no está aquí, simplemente no se muestra unidad.

    `permite_decimales` además se usa para validar cantidades: una familia
    "por unidad" (tornillos, capuchones) no debería aceptar "3.5"; una
    familia "por metro" (fibra de vidrio) sí."""

    __tablename__ = "tabla_unidades_familia"

    id: Mapped[int] = mapped_column(primary_key=True)
    familia: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    unidad: Mapped[str] = mapped_column(String(20), nullable=False)
    permite_decimales: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
