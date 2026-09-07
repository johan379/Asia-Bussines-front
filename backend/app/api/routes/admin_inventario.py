from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, literal
from sqlalchemy.orm import Session

from app.api.deps import get_db, requiere_rol
from app.models.bodega import Bodega
from app.models.producto import Producto
from app.models.rollo import Rollo
from app.models.usuario import RolUsuario
from app.schemas.admin_inventario import ComparativoInventarioResponse, FilaComparativoResponse
from app.schemas.rollos import RolloResponse

router = APIRouter(
    prefix="/admin-inventario", tags=["Admin Inventario"],
    dependencies=[Depends(requiere_rol(RolUsuario.ADMIN_INVENTARIO))],
)


def _pivotear(filas, *, con_color: bool, con_peso: bool = False, con_familia: bool = False) -> list[FilaComparativoResponse]:
    """`con_color=True` para rollos (pinta la fila por color_material en el
    frontend); productos no tienen ese concepto, solo llevan calibre.
    `con_peso=True` también agrega peso neto (toneladas) y cantidad de
    rollos por bodega — solo aplica a rollos, un producto no se cuenta por
    unidad física ni tiene peso_neto. `con_familia=True` (solo productos)
    agrega la familia para resolver su unidad de medida en el frontend."""
    agrupado: dict[str, dict] = {}
    for fila in filas:
        codigo, descripcion, bodega_id, total, extra, calibre, peso, cantidad_rollos = fila[:8]
        familia = fila[8] if con_familia else ""
        entrada = agrupado.setdefault(
            codigo, {"descripcion": "", "color_material": "", "calibre": "", "familia": "", "por_bodega": {}, "total": 0.0,
                     "peso_por_bodega": {}, "peso_total": 0.0, "cantidad_por_bodega": {}, "cantidad_total": 0}
        )
        cantidad = round(float(total or 0), 2)
        entrada["por_bodega"][bodega_id] = cantidad
        entrada["total"] = round(entrada["total"] + cantidad, 2)
        if descripcion and not entrada["descripcion"]:
            entrada["descripcion"] = descripcion
        if con_color and extra and not entrada["color_material"]:
            entrada["color_material"] = extra
        if calibre and not entrada["calibre"]:
            entrada["calibre"] = str(calibre)
        if familia and not entrada["familia"]:
            entrada["familia"] = familia
        if con_peso:
            peso_valor = round(float(peso or 0), 2)
            entrada["peso_por_bodega"][bodega_id] = peso_valor
            entrada["peso_total"] = round(entrada["peso_total"] + peso_valor, 2)
            entrada["cantidad_por_bodega"][bodega_id] = int(cantidad_rollos or 0)
            entrada["cantidad_total"] += int(cantidad_rollos or 0)
    return [
        FilaComparativoResponse(codigo=codigo, descripcion=datos["descripcion"],
                                 color_material=datos["color_material"], calibre=datos["calibre"],
                                 familia=datos["familia"],
                                 por_bodega=datos["por_bodega"], total=datos["total"],
                                 peso_por_bodega=datos["peso_por_bodega"], peso_total=datos["peso_total"],
                                 cantidad_por_bodega=datos["cantidad_por_bodega"], cantidad_total=datos["cantidad_total"])
        for codigo, datos in sorted(agrupado.items())
    ]


@router.get("/comparativo", response_model=ComparativoInventarioResponse)
def comparativo_inventario(db: Session = Depends(get_db)) -> dict:
    """Compara el inventario de todas las sedes en un solo lugar. Solo
    lectura (SELECT + GROUP BY) — no reasigna la propiedad de ningún rollo
    ni producto. Admin Inventario nunca aparece: su propio material sin
    asignar (bodega_id IS NULL) se consulta en /rollos e
    /inventario/productos, no aquí."""
    bodegas = db.query(Bodega).order_by(Bodega.nombre).all()

    filas_rollos = (
        db.query(
            Rollo.codigo_interno, func.max(Rollo.descripcion), Rollo.bodega_id, func.sum(Rollo.metros_disponibles),
            func.max(Rollo.color_material), func.max(Rollo.calibre), func.sum(Rollo.peso_neto), func.count(Rollo.id),
        )
        .filter(Rollo.bodega_id.isnot(None))
        .group_by(Rollo.codigo_interno, Rollo.bodega_id)
        .all()
    )
    filas_productos = (
        db.query(
            # _pivotear desempaqueta por posición (codigo, descripcion, bodega_id,
            # total, extra, calibre, peso, cantidad_rollos, familia); productos no
            # usa "extra" (con_color=False) ni "peso"/"cantidad_rollos" (con_peso=False
            # por defecto) — solo el calibre real (posición 5) y familia importan aquí.
            Producto.codigo, func.max(Producto.descripcion), Producto.bodega_id, func.sum(Producto.stock),
            literal(None), func.max(Producto.calibre), literal(None), literal(None),
            func.max(Producto.familia),
        )
        .filter(Producto.bodega_id.isnot(None), Producto.familia != "Rollos de acero")
        .group_by(Producto.codigo, Producto.bodega_id)
        .all()
    )

    rollos_pivotados = _pivotear(filas_rollos, con_color=True, con_peso=True)
    peso_total_por_bodega: dict[int, float] = {}
    for fila in rollos_pivotados:
        for bodega_id, peso in fila.peso_por_bodega.items():
            peso_total_por_bodega[bodega_id] = round(peso_total_por_bodega.get(bodega_id, 0) + peso, 2)

    return {
        "bodegas": bodegas,
        "rollos": rollos_pivotados,
        "productos": _pivotear(filas_productos, con_color=False, con_familia=True),
        "peso_total_por_bodega": peso_total_por_bodega,
        "peso_total_general": round(sum(peso_total_por_bodega.values()), 2),
    }


@router.get("/rollos-por-codigo", response_model=list[RolloResponse])
def rollos_por_codigo(
    codigo_interno: str = Query(..., min_length=1), db: Session = Depends(get_db),
) -> list[Rollo]:
    """Rollos individuales (uno por uno, con su propio peso, bodega y
    estado) de un código específico, en todas las sedes — para poder ver,
    desde una fila del resumen comparativo, exactamente cuál rollo pesa
    cuánto y en qué sede está."""
    return (
        db.query(Rollo)
        .filter(Rollo.codigo_interno == codigo_interno, Rollo.bodega_id.isnot(None))
        .order_by(Rollo.bodega_id.asc(), Rollo.fecha_ingreso.desc())
        .all()
    )
