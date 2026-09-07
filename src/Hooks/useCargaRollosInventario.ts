import { useCargaMasivaExcel } from "./useCargaMasivaExcel";
import { CAMPOS_REQUERIDOS_CARGA_ROLLOS } from "../Utils/cargaRollos";

/** Carga masiva de rollos existentes desde Excel: subir → mapear → confirmar. */
export function useCargaRollosInventario({ cargarRollos }: { cargarRollos: () => Promise<void> }) {
  const c = useCargaMasivaExcel({
    rutaBase: "/rollos/carga",
    camposRequeridos: CAMPOS_REQUERIDOS_CARGA_ROLLOS,
    alRecargar: cargarRollos,
  });

  return {
    pasoCargaRollos: c.paso,
    nombreArchivoCargaRollos: c.nombreArchivo,
    procesandoArchivoCargaRollos: c.procesandoArchivo,
    errorArchivoCargaRollos: c.errorArchivo,
    cargarArchivoRollos: c.cargarArchivo,
    encabezadosCargaRollos: c.encabezados,
    mapeoColumnasCargaRollos: c.mapeoColumnas,
    hojasDisponiblesCargaRollos: c.hojasDisponibles,
    hojaActualCargaRollos: c.hojaActual,
    cambiandoHojaCargaRollos: c.cambiandoHoja,
    cambiarHojaCargaRollos: c.cambiarHoja,
    actualizarMapeoColumnaRollos: c.actualizarMapeoColumna,
    faltanCamposRequeridosCargaRollos: c.faltanCamposRequeridos,
    confirmandoCargaRollos: c.confirmandoCarga,
    errorConfirmacionCargaRollos: c.errorConfirmacionCarga,
    confirmarCargaRollos: c.confirmarCarga,
    resultadoCargaRollos: c.resultadoCarga,
    reiniciarCargaRollos: c.reiniciarCarga,
  };
}
