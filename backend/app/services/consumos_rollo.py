"""Reglas transaccionales para el consumo individual de rollos."""

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import coincide_bodega
from app.models.movimiento import Movimiento, TipoMovimiento
from app.models.rollo import HistorialConsumoRollo, Rollo
from app.models.usuario import Usuario


def registrar_consumo_rollo(
    db: Session, *, rollo_id: int, cantidad: float, observaciones: str, usuario: Usuario
) -> Rollo:
    """Bloquea, valida y descuenta un rollo sin confirmar la transacción."""
    rollo = (
        db.query(Rollo)
        .filter(Rollo.id == rollo_id, coincide_bodega(Rollo.bodega_id, usuario.bodega_id))
        .with_for_update()
        .first()
    )
    if rollo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rollo no encontrado.")
    if cantidad <= 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a cero.")
    if cantidad > rollo.metros_disponibles:
        raise HTTPException(status_code=400, detail=f"Ese rollo solo tiene {rollo.metros_disponibles} m disponibles.")
    ahora = datetime.now(timezone.utc)
    rollo.metros_disponibles -= cantidad
    rollo.metros_consumidos += cantidad
    rollo.recalcular_estado()
    db.add(HistorialConsumoRollo(rollo_id=rollo.id, fecha=ahora, cantidad=cantidad, usuario=usuario.correo, observaciones=observaciones))
    db.add(Movimiento(
        fecha=ahora, tipo=TipoMovimiento.SALIDA, motivo="produccion", producto_codigo=rollo.codigo_interno,
        producto_descripcion=f"{rollo.descripcion} (rollo {rollo.identificador_rollo})",
        rollo_id=rollo.id, identificador_rollo=rollo.identificador_rollo,
        bodega_origen_id=usuario.bodega_id, bodega_destino_id=None, cantidad=cantidad, usuario=usuario.correo,
        observaciones=observaciones or "Consumo en producción.",
    ))
    return rollo


def registrar_salida_externa_rollo(
    db: Session, *, rollo_id: int, empresa: str, observaciones: str, usuario: Usuario
) -> Rollo:
    """Saca el rollo COMPLETO hacia otra empresa (intercambio externo, no una
    transferencia entre nuestras bodegas). Reutiliza el mismo mecanismo que
    el consumo: mueve todos los metros disponibles a consumidos y deja que
    `recalcular_estado()` derive AGOTADO -- nunca se toca `estado` a mano."""
    rollo = (
        db.query(Rollo)
        .filter(Rollo.id == rollo_id, coincide_bodega(Rollo.bodega_id, usuario.bodega_id))
        .with_for_update()
        .first()
    )
    if rollo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rollo no encontrado.")
    empresa = empresa.strip()
    if not empresa:
        raise HTTPException(status_code=400, detail="El nombre de la empresa es obligatorio.")
    if rollo.metros_disponibles <= 0:
        raise HTTPException(status_code=400, detail="Este rollo ya está agotado, no tiene metros disponibles.")
    ahora = datetime.now(timezone.utc)
    cantidad = rollo.metros_disponibles
    rollo.metros_consumidos += cantidad
    rollo.metros_disponibles = 0
    rollo.recalcular_estado()
    db.add(Movimiento(
        fecha=ahora, tipo=TipoMovimiento.SALIDA, motivo="intercambio_externo", producto_codigo=rollo.codigo_interno,
        producto_descripcion=f"{rollo.descripcion} (rollo {rollo.identificador_rollo})",
        rollo_id=rollo.id, identificador_rollo=rollo.identificador_rollo,
        bodega_origen_id=usuario.bodega_id, bodega_destino_id=None, cantidad=cantidad, usuario=usuario.correo,
        empresa_externa=empresa, observaciones=observaciones or f"Intercambio con {empresa}.",
    ))
    return rollo
