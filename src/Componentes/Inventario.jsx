/* oxlint-disable react/only-export-components */
import { useProductosInventario } from "../Hooks/useProductosInventario.js";
import { useHistorialInventario } from "../Hooks/useHistorialInventario.js";
import { useMovimientosInventario, MOTIVOS_ENTRADA, MOTIVOS_SALIDA } from "../Hooks/useMovimientosInventario.js";

export { MOTIVOS_ENTRADA, MOTIVOS_SALIDA };

// Fachada temporal: conserva el contrato de InventarioPage mientras cada
// responsabilidad queda aislada en su hook para crecer y probarse por separado.
export function useControladorInventario(sesion, almacen) {
  const productos = useProductosInventario();
  const historial = useHistorialInventario(sesion?.bodegaId);
  const movimientos = useMovimientosInventario({
    sesion,
    almacen,
    cargarProductos: productos.cargarProductos,
    cargarHistorial: historial.cargarHistorial,
  });
  return { ...productos, ...movimientos, ...historial };
}
