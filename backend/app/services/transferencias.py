from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.movimiento import Movimiento, TipoMovimiento
from app.models.producto import Producto
from app.models.rollo import Rollo
from app.models.solicitud import EstadoSolicitud, Solicitud
from app.models.usuario import Usuario
from app.schemas.bodegas import SolicitudCrear


def _decimal(valor: float | Decimal) -> Decimal:
    return Decimal(str(valor))


def crear_solicitud_transferencia(
    db: Session, datos: SolicitudCrear, usuario: Usuario
) -> Solicitud:
    """Crea una solicitud, aplicando bloqueos y validaciones reutilizables."""
    if datos.rollo_id is not None:
        rollo = db.query(Rollo).filter(Rollo.id == datos.rollo_id).with_for_update().first()
        if rollo is None:
            raise HTTPException(status_code=404, detail="Rollo no encontrado.")
        if rollo.metros_disponibles <= 0:
            raise HTTPException(status_code=400, detail="El rollo no tiene metros disponibles.")
        if rollo.bodega_id == usuario.bodega_id:
            raise HTTPException(status_code=400, detail="Selecciona un rollo de otra bodega.")
        if db.query(Solicitud.id).filter(
            Solicitud.rollo_id == rollo.id, Solicitud.estado == EstadoSolicitud.PENDIENTE
        ).first() is not None:
            raise HTTPException(status_code=409, detail="Este rollo ya tiene una solicitud pendiente de otra bodega.")
        return Solicitud(
            fecha=datetime.now(timezone.utc), estado=EstadoSolicitud.PENDIENTE,
            tipo_operacion=datos.tipo_operacion, cantidad=rollo.metros_disponibles,
            producto_codigo=rollo.codigo_interno,
            producto_descripcion=f"{rollo.descripcion} (rollo {rollo.identificador_rollo})",
            rollo_id=rollo.id, bodega_solicitante_id=usuario.bodega_id,
            bodega_propietaria_id=rollo.bodega_id, solicitado_por=usuario.correo,
            observaciones=datos.observaciones,
        )

    if datos.producto_id is None or datos.cantidad is None:
        raise HTTPException(status_code=400, detail="Selecciona un producto o un rollo.")
    producto = db.query(Producto).filter(Producto.id == datos.producto_id).with_for_update().first()
    if producto is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado.")
    if producto.bodega_id == usuario.bodega_id:
        raise HTTPException(status_code=400, detail="Selecciona material de otra bodega.")
    if datos.cantidad <= 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a cero.")
    if _decimal(datos.cantidad) > producto.stock:
        raise HTTPException(status_code=400, detail="La cantidad supera la disponibilidad de esa bodega.")
    return Solicitud(
        fecha=datetime.now(timezone.utc), estado=EstadoSolicitud.PENDIENTE,
        tipo_operacion=datos.tipo_operacion, cantidad=datos.cantidad,
        producto_codigo=producto.codigo, producto_descripcion=producto.descripcion,
        rollo_id=None, bodega_solicitante_id=usuario.bodega_id,
        bodega_propietaria_id=producto.bodega_id, solicitado_por=usuario.correo,
        observaciones=datos.observaciones,
    )


def rechazar_solicitud_transferencia(
    db: Session, solicitud_id: int, usuario: Usuario
) -> Solicitud:
    """Rechaza una solicitud pendiente de la bodega propietaria."""
    solicitud = db.query(Solicitud).filter(Solicitud.id == solicitud_id).with_for_update().first()
    if solicitud is None or solicitud.bodega_propietaria_id != usuario.bodega_id:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada.")
    if solicitud.estado != EstadoSolicitud.PENDIENTE:
        raise HTTPException(status_code=400, detail="Esta solicitud ya fue procesada.")
    solicitud.estado = EstadoSolicitud.RECHAZADA
    return solicitud


def aceptar_solicitud_transferencia(
    db: Session, solicitud_id: int, usuario: Usuario
) -> Solicitud:
    """Aplica una transferencia aceptada sin confirmar la transaccion."""
    solicitud = (
        db.query(Solicitud)
        .filter(Solicitud.id == solicitud_id)
        .with_for_update()
        .first()
    )
    if solicitud is None or solicitud.bodega_propietaria_id != usuario.bodega_id:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada.")
    if solicitud.estado != EstadoSolicitud.PENDIENTE:
        raise HTTPException(status_code=400, detail="Esta solicitud ya fue procesada.")

    if solicitud.rollo_id is not None:
        rollo = db.query(Rollo).filter(Rollo.id == solicitud.rollo_id).with_for_update().first()
        if rollo is None or rollo.bodega_id != solicitud.bodega_propietaria_id:
            raise HTTPException(status_code=400, detail="El rollo ya no esta disponible en esta bodega.")
        rollo.bodega_id = solicitud.bodega_solicitante_id
        db.add(Movimiento(
            fecha=datetime.now(timezone.utc), tipo=TipoMovimiento.TRANSFERENCIA,
            motivo=solicitud.tipo_operacion.value, producto_codigo=rollo.codigo_interno,
            producto_descripcion=f"{rollo.descripcion} (rollo {rollo.identificador_rollo})",
            bodega_origen_id=solicitud.bodega_propietaria_id,
            bodega_destino_id=solicitud.bodega_solicitante_id,
            cantidad=rollo.metros_disponibles, usuario=usuario.correo,
            observaciones=f"Transferencia aceptada del rollo {rollo.identificador_rollo}.",
        ))
        solicitud.estado = EstadoSolicitud.ACEPTADA
        return solicitud

    producto_origen = (
        db.query(Producto)
        .filter(Producto.codigo == solicitud.producto_codigo,
                Producto.bodega_id == solicitud.bodega_propietaria_id)
        .with_for_update().first()
    )
    cantidad = _decimal(solicitud.cantidad)
    if producto_origen is None or producto_origen.stock < cantidad:
        raise HTTPException(status_code=400, detail="Ya no hay stock suficiente para aceptar esta solicitud.")
    producto_origen.stock -= cantidad
    producto_destino = (
        db.query(Producto)
        .filter(Producto.codigo == solicitud.producto_codigo,
                Producto.bodega_id == solicitud.bodega_solicitante_id)
        .with_for_update().first()
    )
    if producto_destino:
        producto_destino.stock += cantidad
        producto_destino.entrada += cantidad
    else:
        db.add(Producto(
            bodega_id=solicitud.bodega_solicitante_id,
            codigo_importacion=producto_origen.codigo_importacion, codigo=producto_origen.codigo,
            descripcion=producto_origen.descripcion, familia=producto_origen.familia,
            calibre=producto_origen.calibre, entrada=solicitud.cantidad,
            stock=solicitud.cantidad,
        ))
    db.add(Movimiento(
        fecha=datetime.now(timezone.utc), tipo=TipoMovimiento.TRANSFERENCIA,
        motivo=solicitud.tipo_operacion.value, producto_codigo=solicitud.producto_codigo,
        producto_descripcion=solicitud.producto_descripcion,
        bodega_origen_id=solicitud.bodega_propietaria_id,
        bodega_destino_id=solicitud.bodega_solicitante_id,
        cantidad=solicitud.cantidad, usuario=usuario.correo,
        observaciones=f"Transferencia aceptada ({solicitud.tipo_operacion.value}).",
    ))
    solicitud.estado = EstadoSolicitud.ACEPTADA
    if producto_origen.stock <= 0:
        db.delete(producto_origen)
    return solicitud
