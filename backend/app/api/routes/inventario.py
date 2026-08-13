from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, usuario_actual
from app.models.movimiento import Movimiento, TipoMovimiento
from app.models.producto import Producto
from app.models.rollo import Rollo
from app.models.usuario import Usuario
from app.schemas.inventario import (
    MovimientoCrear, MovimientoResponse, PaginaMovimientos, PaginaProductos,
    ProductoActualizar, ProductoCrear, ProductoResponse,
)
from app.services.movimientos import registrar_movimiento as aplicar_movimiento

router = APIRouter(prefix="/inventario", tags=["Inventario"])


def _producto_de_mi_bodega(db: Session, producto_id: int, usuario: Usuario) -> Producto:
    producto = db.get(Producto, producto_id)
    if producto is None or producto.bodega_id != usuario.bodega_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado.")
    return producto


@router.get("/productos", response_model=list[ProductoResponse] | PaginaProductos)
def listar_productos(
    busqueda: str = "", pagina: int = Query(1, ge=1), tamano: int = Query(30, ge=1, le=100),
    paginado: bool = False, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual),
) -> list[Producto | dict] | PaginaProductos:
    consulta = db.query(Producto).filter(Producto.bodega_id == usuario.bodega_id, Producto.familia != "Rollos de acero")
    if busqueda:
        termino = f"%{busqueda.lower()}%"
        consulta = consulta.filter(Producto.codigo.ilike(termino) | Producto.codigo_importacion.ilike(termino) | Producto.descripcion.ilike(termino))
    productos = list(consulta.order_by(Producto.id.desc()).all())
    rollos = db.query(Rollo).filter(Rollo.bodega_id == usuario.bodega_id).all()
    filas_rollos = [{
        "id": -rollo.id, "bodega_id": rollo.bodega_id, "codigo_importacion": rollo.codigo_proveedor or "",
        "codigo": rollo.codigo_interno, "descripcion": f"{rollo.descripcion} (rollo {rollo.identificador_rollo})",
        "familia": "Rollos de acero", "calibre": str(rollo.calibre), "peso_neto": rollo.peso_neto,
        "entrada": round(rollo.metros_disponibles + rollo.metros_consumidos, 2), "stock": rollo.metros_disponibles,
        "rollo_id": rollo.id, "identificador_rollo": rollo.identificador_rollo,
    } for rollo in rollos]
    if busqueda:
        termino = busqueda.lower()
        filas_rollos = [fila for fila in filas_rollos if termino in fila["codigo"].lower() or termino in fila["codigo_importacion"].lower() or termino in fila["descripcion"].lower()]
    filas = [*productos, *filas_rollos]
    if not paginado: return filas
    total = len(filas); inicio = (pagina - 1) * tamano
    return PaginaProductos(items=filas[inicio:inicio + tamano], total=total, pagina=pagina, tamano=tamano, total_paginas=max(1, (total + tamano - 1) // tamano))


@router.post("/productos", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
def crear_producto(datos: ProductoCrear, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual)) -> Producto:
    producto = Producto(bodega_id=usuario.bodega_id, **datos.model_dump())
    db.add(producto); db.commit(); db.refresh(producto)
    return producto


@router.put("/productos/{producto_id}", response_model=ProductoResponse)
def actualizar_producto(producto_id: int, datos: ProductoActualizar, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual)) -> Producto:
    producto = _producto_de_mi_bodega(db, producto_id, usuario)
    for campo, valor in datos.model_dump().items(): setattr(producto, campo, valor)
    db.commit(); db.refresh(producto)
    return producto


@router.delete("/productos/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_producto(producto_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual)) -> None:
    db.delete(_producto_de_mi_bodega(db, producto_id, usuario)); db.commit()


@router.post("/movimientos", response_model=MovimientoResponse, status_code=status.HTTP_201_CREATED)
def registrar_movimiento(datos: MovimientoCrear, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual)) -> Movimiento:
    movimiento = aplicar_movimiento(db, datos, usuario)
    db.commit(); db.refresh(movimiento)
    return movimiento


@router.get("/historial", response_model=list[MovimientoResponse] | PaginaMovimientos)
def historial(
    codigo_producto: str = "", tipo: TipoMovimiento | None = None, fecha_desde: datetime | None = None,
    fecha_hasta: datetime | None = None, pagina: int = Query(1, ge=1), tamano: int = Query(30, ge=1, le=100),
    paginado: bool = False, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual),
) -> list[Movimiento] | PaginaMovimientos:
    # Una bodega solo ve los movimientos en que fue origen o destino.
    consulta = db.query(Movimiento).filter((Movimiento.bodega_origen_id == usuario.bodega_id) | (Movimiento.bodega_destino_id == usuario.bodega_id))
    if codigo_producto: consulta = consulta.filter(Movimiento.producto_codigo.ilike(f"%{codigo_producto}%"))
    if tipo: consulta = consulta.filter(Movimiento.tipo == tipo)
    if fecha_desde: consulta = consulta.filter(Movimiento.fecha >= fecha_desde)
    if fecha_hasta: consulta = consulta.filter(Movimiento.fecha <= fecha_hasta)
    consulta = consulta.order_by(Movimiento.fecha.desc())
    if not paginado: return consulta.all()
    total = consulta.count()
    return PaginaMovimientos(items=consulta.offset((pagina - 1) * tamano).limit(tamano).all(), total=total,
                             pagina=pagina, tamano=tamano, total_paginas=max(1, (total + tamano - 1) // tamano))
