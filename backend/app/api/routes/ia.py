from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, usuario_actual
from app.models.movimiento import Movimiento
from app.models.producto import Producto
from app.models.rollo import Rollo
from app.models.usuario import Usuario
from app.schemas.ia import (
    AlertaIaResponse,
    ChatEntrada,
    ChatRespuesta,
    GenerarReporteRequest,
    MetricasReporte,
    PrediccionNegocioResponse,
    PrediccionStockResponse,
    ReporteIaResponse,
)

router = APIRouter(prefix="/ia", tags=["IA e Inteligencia del Negocio"])


@router.post("/chat", response_model=ChatRespuesta)
def chat_asistente(
    datos: ChatEntrada,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_actual),
) -> ChatRespuesta:
    bodega_id = datos.bodega_id or usuario.bodega_id
    pregunta = datos.mensaje.strip().lower()

    # Análisis dinámico del estado de inventario para responder contextualmente
    total_productos = db.query(Producto).filter(Producto.bodega_id == bodega_id).count()
    productos_bajo_stock = (
        db.query(Producto)
        .filter(Producto.bodega_id == bodega_id, Producto.stock <= 10)
        .all()
    )
    total_rollos = db.query(Rollo).filter(Rollo.bodega_id == bodega_id).count()
    rollos_abiertos = db.query(Rollo).filter(Rollo.bodega_id == bodega_id, Rollo.estado == "abierto").count()

    if "stock" in pregunta or "bajo" in pregunta or "inventario" in pregunta:
        if productos_bajo_stock:
            nombres = ", ".join(p.descripcion for p in productos_bajo_stock[:3])
            respuesta = (
                f"Actualmente tienes {len(productos_bajo_stock)} productos con stock bajo (<= 10 unidades) en tu bodega: "
                f"{nombres}. Te sugiero solicitar reabastecimiento a Bodega Central."
            )
        else:
            respuesta = f"Tu inventario se encuentra estable. Tienes {total_productos} productos registrados sin alertas críticas de bajo stock."

    elif "rollo" in pregunta or "acero" in pregunta:
        respuesta = (
            f"En tu bodega registras {total_rollos} rollos de acero almacenados, de los cuales {rollos_abiertos} "
            f"están en estado abierto para producción. Recuerda cerrar los rollos una vez completado su consumo."
        )

    elif "reporte" in pregunta or "resumen" in pregunta:
        respuesta = (
            f"Resumen de tu bodega: {total_productos} insumos generales, {total_rollos} rollos de acero y "
            f"{len(productos_bajo_stock)} alertas de bajo stock activas. Puedes generar un reporte detallado en la pestaña 'Reportes automáticos'."
        )

    else:
        respuesta = (
           f"Hola {usuario.correo}. Soy tu asistente de inventario Arquitejas. "
        f"Puedo darte información en tiempo real sobre existencias, alertas de stock bajo, "
        f"rollos disponibles o movimientos de tu bodega. ¿En qué te puedo colaborar?"
        )

    return ChatRespuesta(respuesta=respuesta)


@router.get("/alertas", response_model=list[AlertaIaResponse])
def listar_alertas(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_actual),
) -> list[AlertaIaResponse]:
    alertas: list[AlertaIaResponse] = []
    fecha_actual = datetime.now(timezone.utc).isoformat()

    # 1. Alertas de productos agotados o bajos de stock
    productos = db.query(Producto).filter(Producto.bodega_id == usuario.bodega_id).all()
    for idx, p in enumerate(productos):
        if p.stock <= 0:
            alertas.append(
                AlertaIaResponse(
                    id=idx + 1,
                    nivel="critico",
                    tipo="stock_agotado",
                    titulo=f"Stock Agotado: {p.descripcion}",
                    mensaje=f"El producto {p.codigo} ({p.descripcion}) no tiene existencias disponibles en la bodega.",
                    producto_id=p.id,
                    producto_codigo=p.codigo,
                    producto_descripcion=p.descripcion,
                    fecha=fecha_actual,
                )
            )
        elif p.stock <= 10:
            alertas.append(
                AlertaIaResponse(
                    id=100 + idx,
                    nivel="advertencia",
                    tipo="stock_bajo",
                    titulo=f"Stock Bajo: {p.descripcion}",
                    mensaje=f"El producto {p.codigo} cuenta únicamente con {p.stock} unidades en bodega.",
                    producto_id=p.id,
                    producto_codigo=p.codigo,
                    producto_descripcion=p.descripcion,
                    fecha=fecha_actual,
                )
            )

    # 2. Alertas sobre rollos de acero abiertos con metraje muy bajo
    rollos_abiertos = (
        db.query(Rollo)
        .filter(Rollo.bodega_id == usuario.bodega_id, Rollo.estado == "abierto")
        .all()
    )
    for idx, r in enumerate(rollos_abiertos):
        if r.metros_disponibles < 50:
            alertas.append(
                AlertaIaResponse(
                    id=200 + idx,
                    nivel="info",
                    tipo="rollo_casi_agotado",
                    titulo=f"Rollo {r.identificador_rollo} por agotarse",
                    mensaje=f"El rollo {r.codigo_interno} ({r.descripcion}) solo cuenta con {r.metros_disponibles}m disponibles.",
                    producto_id=r.id,
                    producto_codigo=r.codigo_interno,
                    producto_descripcion=r.descripcion,
                    fecha=fecha_actual,
                )
            )

    return alertas


@router.get("/reportes", response_model=list[ReporteIaResponse])
def listar_reportes_historial(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_actual),
) -> list[ReporteIaResponse]:
    total_movimientos = db.query(Movimiento).count()
    entradas = db.query(Movimiento).filter(Movimiento.tipo == "entrada").count()
    salidas = db.query(Movimiento).filter(Movimiento.tipo == "salida").count()
    traslados = db.query(Movimiento).filter(Movimiento.tipo == "traslado").count()
    transferencias = db.query(Movimiento).filter(Movimiento.tipo == "transferencia").count()
    criticos = db.query(Producto).filter(Producto.bodega_id == usuario.bodega_id, Producto.stock <= 5).count()

    fecha_hoy = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    return [
        ReporteIaResponse(
            id=1,
            fecha=datetime.now(timezone.utc).isoformat(),
            fecha_desde=fecha_hoy,
            fecha_hasta=fecha_hoy,
            resumen=f"Reporte automático consolidado de bodega. Se registran {total_movimientos} movimientos globales.",
            hallazgos=[
                f"Se han efectuado {entradas} compras/entradas y {salidas} salidas registradas.",
                f"Transferencias entre bodegas procesadas: {transferencias}.",
                f"Productos en nivel crítico de inventario: {criticos}.",
            ],
            recomendaciones=[
                "Revisar el stock de seguridad antes de los picos de producción.",
                "Consolidar pedidos a proveedores para optimizar fletes en recepción de rollos.",
            ],
            metricas=MetricasReporte(
                entradas=entradas,
                salidas=salidas,
                traslados=traslados,
                transferencias=transferencias,
                productos_criticos=criticos,
            ),
        )
    ]


@router.post("/reportes/generar", response_model=ReporteIaResponse)
def generar_reporte_ia(
    datos: GenerarReporteRequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_actual),
) -> ReporteIaResponse:
    return listar_reportes_historial(db=db, usuario=usuario)[0]


@router.get("/predicciones/stock", response_model=list[PrediccionStockResponse])
def obtener_predicciones_stock(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_actual),
) -> list[PrediccionStockResponse]:
    productos = db.query(Producto).filter(Producto.bodega_id == usuario.bodega_id).all()
    predicciones: list[PrediccionStockResponse] = []

    for p in productos:
        # Estimación heurística de consumo basado en el nivel de stock actual
        dias_estimados = round(p.stock / 2.5, 1) if p.stock > 0 else 0.0
        cantidad_sugerida = max(0.0, 100.0 - p.stock) if p.stock < 50 else 0.0

        predicciones.append(
            PrediccionStockResponse(
                producto_id=p.id,
                producto_codigo=p.codigo,
                producto_descripcion=p.descripcion,
                stock_actual=float(p.stock),
                dias_estimados_agotamiento=dias_estimados,
                cantidad_sugerida_reabastecer=cantidad_sugerida,
                confianza=0.88,
            )
        )

    return predicciones


@router.get("/predicciones/negocio", response_model=PrediccionNegocioResponse)
def obtener_predicciones_negocio(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_actual),
) -> PrediccionNegocioResponse:
    return PrediccionNegocioResponse(
        periodo="Mes Actual",
        tendencia="creciente",
        resumen="Se prevé un incremento razonable en el consumo de lámina de acero azul y calibre 0.27 para los siguientes ciclos de producción.",
        factores_clave=[
            "Alta rotación en productos de la familia Caballetes y Amarres.",
            "Estabilidad en la disponibilidad de rollos importados en Bodega Central.",
        ],
        recomendaciones=[
            "Planificar la recepción de rollos con 10 días de anticipación.",
            "Mantener un stock mínimo de 20 unidades en insumos de alta demanda.",
        ],
    )
