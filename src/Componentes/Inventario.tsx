/* oxlint-disable react/only-export-components */
import { useProductosInventario } from "../Hooks/useProductosInventario";
import { useHistorialInventario } from "../Hooks/useHistorialInventario";
import { useMovimientosInventario, MOTIVOS_ENTRADA, MOTIVOS_SALIDA } from "../Hooks/useMovimientosInventario";
import { useCargaProductosInventario } from "../Hooks/useCargaProductosInventario";
import type { Sesion, AlmacenGlobal } from "../types/dominio";

export { MOTIVOS_ENTRADA, MOTIVOS_SALIDA };

// Fachada temporal: conserva el contrato de InventarioPage mientras cada
// responsabilidad queda aislada en su hook para crecer y probarse por separado.
export function useControladorInventario(sesion: Sesion, almacen: AlmacenGlobal) {
  const productos = useProductosInventario();
  const bodegaId = sesion?.bodegaId ?? undefined;
  const historial = useHistorialInventario(bodegaId);
  const movimientos = useMovimientosInventario({
    sesion: { bodegaId },
    almacen,
    cargarProductos: productos.cargarProductos,
    cargarHistorial: historial.cargarHistorial,
    cargarAlertasStock: productos.cargarAlertasStock,
  });
  const cargaProductos = useCargaProductosInventario({ cargarProductos: productos.cargarProductos });
  return { ...productos, ...movimientos, ...historial, ...cargaProductos };
}
