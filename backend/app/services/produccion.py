"""Reglas transaccionales para registrar producción y consumo de rollos."""

from datetime import datetime, timezone
from secrets import token_hex
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.movimiento import Movimiento, TipoMovimiento
from app.models.produccion import Produccion, RolloUtilizadoProduccion
from app.models.rollo import Rollo
from app.models.usuario import Usuario
from app.schemas.produccion import ProduccionCrear


def registrar_produccion(db: Session, datos: ProduccionCrear, usuario: Usuario) -> Produccion:
    if not datos.rollos: raise HTTPException(status_code=400, detail="Selecciona al menos un rollo y sus metros a consumir.")
    ahora = datetime.now(timezone.utc); bloqueados: list[Rollo] = []
    for item in datos.rollos:
        rollo = db.query(Rollo).filter(Rollo.id == item.rollo_id, Rollo.bodega_id == usuario.bodega_id).with_for_update().first()
        if rollo is None: raise HTTPException(status_code=404, detail=f"Rollo {item.rollo_id} no encontrado.")
        if rollo.estado == "agotado" or item.metros > rollo.metros_disponibles:
            raise HTTPException(status_code=400, detail=f"El rollo {rollo.identificador_rollo} no tiene metros suficientes.")
        if any(otro.id == rollo.id for otro in bloqueados): raise HTTPException(status_code=400, detail="No puedes usar el mismo rollo más de una vez.")
        bloqueados.append(rollo)
    codigo = bloqueados[0].codigo_interno
    if any(rollo.codigo_interno != codigo for rollo in bloqueados): raise HTTPException(status_code=400, detail="Todos los rollos deben pertenecer al mismo código de clasificación.")
    sello = ahora.strftime("%Y%m%d%H%M%S"); codigo_unico = f"PROD-{sello}-{token_hex(3).upper()}"; cotizacion = f"P{token_hex(4).upper()}"
    produccion = Produccion(codigo_unico=codigo_unico, cotizacion=cotizacion, fecha=ahora, usuario=usuario.correo, responsable=datos.responsable, bodega_id=usuario.bodega_id, producto_fabricado=datos.producto_fabricado, modelo=datos.modelo, medida_producto=datos.medida_producto, cantidad_productos=datos.cantidad_productos, codigo_clasificacion=codigo, total_metros_consumidos=0, saldo_codigo=0, observaciones=datos.observaciones)
    db.add(produccion); db.flush(); total = saldo = 0.0
    for item, rollo in zip(datos.rollos, bloqueados, strict=True):
        rollo.metros_disponibles = round(rollo.metros_disponibles - item.metros, 2); rollo.metros_consumidos = round(rollo.metros_consumidos + item.metros, 2); rollo.recalcular_estado(); total += item.metros; saldo += rollo.metros_disponibles
        db.add(RolloUtilizadoProduccion(produccion_id=produccion.id, rollo_id=rollo.id, identificador_rollo=rollo.identificador_rollo, metros_consumidos=item.metros))
        db.add(Movimiento(fecha=ahora, tipo=TipoMovimiento.SALIDA, motivo="produccion", producto_codigo=rollo.codigo_interno, producto_descripcion=f"{rollo.descripcion} (rollo {rollo.identificador_rollo})", bodega_origen_id=usuario.bodega_id, bodega_destino_id=None, cantidad=item.metros, usuario=usuario.correo, observaciones=f"Producción {codigo_unico}.", cotizacion=cotizacion))
    produccion.total_metros_consumidos = round(total, 2); produccion.saldo_codigo = round(saldo, 2)
    return produccion
