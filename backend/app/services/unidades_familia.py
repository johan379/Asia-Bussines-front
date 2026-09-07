"""Reglas derivadas de la unidad de medida configurada por familia
(`TablaUnidadFamilia`) — hoy solo valida enteros vs. decimales."""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.unidad_familia import TablaUnidadFamilia


def validar_cantidad_entera_si_aplica(db: Session, familia: str, cantidad: float) -> None:
    """Si la familia está configurada como "solo enteros" (permite_decimales=False),
    bloquea una cantidad con parte decimal. Si la familia no está configurada
    todavía, no valida nada — mismo criterio que el resto de esta tabla: sin
    configurar, no se exige nada."""
    familia = (familia or "").strip()
    if not familia:
        return
    config = db.query(TablaUnidadFamilia).filter(TablaUnidadFamilia.familia == familia).first()
    if config is None or config.permite_decimales:
        return
    if cantidad != int(cantidad):
        raise HTTPException(
            status_code=400,
            detail=f"La familia '{familia}' se mide en {config.unidad} (números enteros); no se permiten decimales.",
        )
