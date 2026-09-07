from pydantic import BaseModel

from app.schemas.bodegas import BodegaResponse


class FilaComparativoResponse(BaseModel):
    codigo: str
    descripcion: str
    color_material: str = ""
    calibre: str = ""
    # Solo para productos (no rollos) — resuelve la unidad de medida junto
    # con TablaUnidadFamilia en el frontend.
    familia: str = ""
    por_bodega: dict[int, float]
    total: float
    # Solo para rollos (peso neto en toneladas y cantidad de rollos); en
    # productos quedan vacíos — un producto no se cuenta por unidad física.
    peso_por_bodega: dict[int, float] = {}
    peso_total: float = 0.0
    cantidad_por_bodega: dict[int, int] = {}
    cantidad_total: int = 0


class ComparativoInventarioResponse(BaseModel):
    """Inventario de todas las sedes lado a lado. Admin Inventario nunca
    aparece aquí — su material sin asignar se ve en /rollos e
    /inventario/productos (bodega_id IS NULL), no en esta vista agregada."""
    bodegas: list[BodegaResponse]
    rollos: list[FilaComparativoResponse]
    productos: list[FilaComparativoResponse]
    peso_total_por_bodega: dict[int, float] = {}
    peso_total_general: float = 0.0
