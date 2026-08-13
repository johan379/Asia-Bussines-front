"""Reglas de negocio transaccionales para entradas, salidas y traslados."""

from datetime import datetime, timezone
from decimal import Decimal
from secrets import token_hex

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.movimiento import Movimiento, TipoMovimiento
from app.models.producto import Producto
from app.models.usuario import Usuario
from app.schemas.inventario import MovimientoCrear


def _decimal(valor: float | Decimal) -> Decimal:
    return Decimal(str(valor))


def registrar_movimiento(db: Session, datos: MovimientoCrear, usuario: Usuario) -> Movimiento:
    """Aplica la regla completa, sin hacer commit para permitir composición."""
    producto = (
        db.query(Producto)
        .filter(Producto.id == datos.producto_id, Producto.bodega_id == usuario.bodega_id)
        .with_for_update()
        .first()
    )
    if producto is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado.")
    cantidad = _decimal(datos.cantidad)
    if datos.tipo == TipoMovimiento.TRASLADO and not datos.bodega_destino_id:
        raise HTTPException(status_code=400, detail="Selecciona a qué bodega se traslada el material.")
    if datos.tipo in (TipoMovimiento.SALIDA, TipoMovimiento.TRASLADO) and cantidad > producto.stock:
        raise HTTPException(status_code=400, detail="La cantidad supera el stock disponible.")
    origen: int | None = usuario.bodega_id
    destino: int | None = usuario.bodega_id
    if datos.tipo == TipoMovimiento.ENTRADA:
        producto.stock += cantidad; producto.entrada += cantidad; origen = None
    elif datos.tipo == TipoMovimiento.SALIDA:
        producto.stock -= cantidad; destino = None
    elif datos.tipo == TipoMovimiento.TRASLADO:
        producto.stock -= cantidad; destino = datos.bodega_destino_id
        producto_destino = db.query(Producto).filter(Producto.codigo == producto.codigo, Producto.bodega_id == destino).with_for_update().first()
        if producto_destino:
            producto_destino.stock += cantidad; producto_destino.entrada += cantidad
        else:
            db.add(Producto(bodega_id=destino, codigo_importacion=producto.codigo_importacion, codigo=producto.codigo,
                            descripcion=producto.descripcion, familia=producto.familia, calibre=producto.calibre,
                            entrada=cantidad, stock=cantidad))
    movimiento = Movimiento(
        fecha=datetime.now(timezone.utc), tipo=datos.tipo, motivo=datos.motivo, producto_codigo=producto.codigo,
        producto_descripcion=producto.descripcion, bodega_origen_id=origen, bodega_destino_id=destino,
        cantidad=datos.cantidad, usuario=usuario.correo, observaciones=datos.observaciones,
        cotizacion=f"COT-{datetime.now(timezone.utc):%Y}-{token_hex(4).upper()}" if datos.tipo == TipoMovimiento.SALIDA else "",
    )
    db.add(movimiento)
    return movimiento
