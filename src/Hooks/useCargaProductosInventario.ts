import { useCargaMasivaExcel } from "./useCargaMasivaExcel";
import { CAMPOS_REQUERIDOS_CARGA_PRODUCTOS } from "../Utils/cargaProductos";

/** Carga masiva de productos generales desde Excel: subir → mapear → confirmar. */
export function useCargaProductosInventario({ cargarProductos }: { cargarProductos: () => Promise<void> }) {
  const c = useCargaMasivaExcel({
    rutaBase: "/inventario/productos/carga",
    camposRequeridos: CAMPOS_REQUERIDOS_CARGA_PRODUCTOS,
    alRecargar: cargarProductos,
  });

  return {
    pasoCarga: c.paso,
    nombreArchivoCarga: c.nombreArchivo,
    procesandoArchivoCarga: c.procesandoArchivo,
    errorArchivoCarga: c.errorArchivo,
    cargarArchivoProductos: c.cargarArchivo,
    encabezadosCarga: c.encabezados,
    mapeoColumnasCarga: c.mapeoColumnas,
    hojasDisponiblesCarga: c.hojasDisponibles,
    hojaActualCarga: c.hojaActual,
    cambiandoHojaCarga: c.cambiandoHoja,
    cambiarHojaCargaProductos: c.cambiarHoja,
    actualizarMapeoColumnaProductos: c.actualizarMapeoColumna,
    faltanCamposRequeridosCarga: c.faltanCamposRequeridos,
    confirmandoCarga: c.confirmandoCarga,
    errorConfirmacionCarga: c.errorConfirmacionCarga,
    confirmarCargaProductos: c.confirmarCarga,
    resultadoCarga: c.resultadoCarga,
    reiniciarCargaProductos: c.reiniciarCarga,
  };
}
