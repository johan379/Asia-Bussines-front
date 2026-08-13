from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, usuario_actual
from app.models.rollo import Rollo
from app.models.usuario import Usuario
from app.schemas.rollos import ActualizarObservacionesRollo, ConsumoRolloCrear, PaginaRollos, RolloResponse
from app.services.consumos_rollo import registrar_consumo_rollo

router = APIRouter(prefix="/rollos", tags=["Rollos almacenados"])


def _rollo_de_mi_bodega(db: Session, rollo_id: int, usuario: Usuario) -> Rollo:
    rollo = db.get(Rollo, rollo_id)
    if rollo is None or rollo.bodega_id != usuario.bodega_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rollo no encontrado.")
    return rollo


@router.get("", response_model=list[RolloResponse] | PaginaRollos)
def listar_rollos(
    codigo_interno: str = "", codigo_proveedor: str = "", descripcion: str = "", familia: str = "",
    color_material: str = "", calibre: str = "", estado: str = "", fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None, pagina: int = Query(1, ge=1), tamano: int = Query(30, ge=1, le=100),
    paginado: bool = False, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual),
) -> list[Rollo] | PaginaRollos:
    consulta = db.query(Rollo).filter(Rollo.bodega_id == usuario.bodega_id)
    if codigo_interno: consulta = consulta.filter(Rollo.codigo_interno.ilike(f"%{codigo_interno}%"))
    if codigo_proveedor: consulta = consulta.filter(Rollo.codigo_proveedor.ilike(f"%{codigo_proveedor}%"))
    if descripcion: consulta = consulta.filter(Rollo.descripcion.ilike(f"%{descripcion}%"))
    if familia: consulta = consulta.filter(Rollo.familia == familia)
    if color_material: consulta = consulta.filter(Rollo.color_material.ilike(f"%{color_material}%"))
    if calibre: consulta = consulta.filter(Rollo.calibre == float(calibre))
    if estado: consulta = consulta.filter(Rollo.estado == estado)
    if fecha_desde: consulta = consulta.filter(Rollo.fecha_ingreso >= fecha_desde)
    if fecha_hasta: consulta = consulta.filter(Rollo.fecha_ingreso <= fecha_hasta)
    consulta = consulta.order_by(Rollo.codigo_interno.asc(), Rollo.fecha_ingreso.desc())
    if not paginado: return consulta.all()
    total = consulta.count()
    return PaginaRollos(items=consulta.offset((pagina - 1) * tamano).limit(tamano).all(), total=total,
                         pagina=pagina, tamano=tamano, total_paginas=max(1, (total + tamano - 1) // tamano))


@router.post("/{rollo_id}/consumo", response_model=RolloResponse)
def registrar_consumo(
    rollo_id: int, datos: ConsumoRolloCrear, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual),
) -> Rollo:
    """Endpoint delgado; la validación, trazabilidad y bloqueo viven en el servicio."""
    rollo = registrar_consumo_rollo(db, rollo_id=rollo_id, cantidad=datos.cantidad,
                                    observaciones=datos.observaciones, usuario=usuario)
    db.commit()
    db.refresh(rollo)
    return rollo


@router.patch("/{rollo_id}/observaciones", response_model=RolloResponse)
def actualizar_observaciones(
    rollo_id: int, datos: ActualizarObservacionesRollo, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual),
) -> Rollo:
    rollo = _rollo_de_mi_bodega(db, rollo_id, usuario)
    rollo.observaciones = datos.observaciones
    db.commit()
    db.refresh(rollo)
    return rollo
