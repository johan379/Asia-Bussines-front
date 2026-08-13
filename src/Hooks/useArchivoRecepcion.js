import { useState } from "react";
import { api, ErrorApi } from "../Componentes/Api";
import { CAMPOS_REQUERIDOS_RECEPCION } from "../Utils/recepcion.js";

/** Carga del Excel y edición de su mapeo, sin lógica de inventario. */
export function useArchivoRecepcion() {
  const [paso, setPaso] = useState("carga"); const [nombreArchivo, setNombreArchivo] = useState("");
  const [procesandoArchivo, setProcesandoArchivo] = useState(false); const [errorArchivo, setErrorArchivo] = useState("");
  const [encabezados, setEncabezados] = useState([]); const [mapeoColumnas, setMapeoColumnas] = useState({});
  const [notaImportacionEquivalencias, setNotaImportacionEquivalencias] = useState("");
  async function cargarArchivo(evento) {
    const archivo = evento.target.files?.[0]; if (!archivo) return false;
    setErrorArchivo(""); setProcesandoArchivo(true); setNombreArchivo(archivo.name);
    try {
      const formData = new FormData(); formData.append("archivo", archivo);
      const respuesta = await api.subirArchivo("/recepcion/previsualizar", formData);
      setNotaImportacionEquivalencias(respuesta.nota_importacion_equivalencias || ""); setEncabezados(respuesta.encabezados); setMapeoColumnas(respuesta.mapeo_sugerido); setPaso("mapeo"); return Boolean(respuesta.nota_importacion_equivalencias);
    } catch (err) { setErrorArchivo(err instanceof ErrorApi ? err.message : "No se pudo leer el archivo. Verifica que sea un Excel válido (.xlsx o .xls)."); return false; }
    finally { setProcesandoArchivo(false); evento.target.value = ""; }
  }
  function actualizarMapeoColumna(campo, encabezado) { setMapeoColumnas((actual) => ({ ...actual, [campo]: encabezado })); }
  function reiniciarArchivo() { setPaso("carga"); setNombreArchivo(""); setErrorArchivo(""); setEncabezados([]); setMapeoColumnas({}); setNotaImportacionEquivalencias(""); }
  return { paso, setPaso, nombreArchivo, procesandoArchivo, errorArchivo, cargarArchivo, encabezados, mapeoColumnas, actualizarMapeoColumna, notaImportacionEquivalencias, faltanCamposRequeridos: CAMPOS_REQUERIDOS_RECEPCION.some((campo) => !mapeoColumnas[campo]), reiniciarArchivo };
}
