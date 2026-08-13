/* oxlint-disable react/only-export-components */
import { useEffect } from "react";
import { useArchivoRecepcion } from "../Hooks/useArchivoRecepcion.js";
import { useEquivalenciasRecepcion } from "../Hooks/useEquivalenciasRecepcion.js";
import { useVerificacionRecepcion } from "../Hooks/useVerificacionRecepcion.js";
import { CAMPOS_REQUERIDOS_RECEPCION, ETIQUETAS_CAMPOS_RECEPCION, TODOS_LOS_CAMPOS_RECEPCION } from "../Utils/recepcion.js";

export function useControladorRecepcion(sesion) {
  const archivo = useArchivoRecepcion();
  const equivalencias = useEquivalenciasRecepcion();
  const verificacion = useVerificacionRecepcion({ sesion, archivo });
  const { cargarEquivalencias } = equivalencias;
  useEffect(() => { if (archivo.notaImportacionEquivalencias) cargarEquivalencias(); }, [archivo.notaImportacionEquivalencias, cargarEquivalencias]);
  async function agregarYReverificar(accion) { const guardada = await accion(); if (guardada && archivo.paso === "verificacion") await verificacion.verificarEnServidor(); }
  function iniciarNuevaRecepcion() { archivo.reiniciarArchivo(); verificacion.reiniciarVerificacion(); }
  return {
    ...archivo, ...verificacion, ...equivalencias,
    CAMPOS_REQUERIDOS: CAMPOS_REQUERIDOS_RECEPCION, ETIQUETAS_CAMPOS: ETIQUETAS_CAMPOS_RECEPCION, TODOS_LOS_CAMPOS: TODOS_LOS_CAMPOS_RECEPCION,
    agregarEquivalenciaColor: (...args) => agregarYReverificar(() => equivalencias.agregarEquivalenciaColor(...args)),
    agregarEquivalenciaTipo: (...args) => agregarYReverificar(() => equivalencias.agregarEquivalenciaTipo(...args)),
    agregarEquivalenciaEspesor: (...args) => agregarYReverificar(() => equivalencias.agregarEquivalenciaEspesor(...args)),
    iniciarNuevaRecepcion,
  };
}
