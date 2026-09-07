import { useState } from "react";
import { api, ErrorApi } from "../Componentes/Api";
import { CAMPOS_REQUERIDOS_RECEPCION } from "../Utils/recepcion";

/** Carga del Excel y edición de su mapeo, sin lógica de inventario. */
export function useArchivoRecepcion() {
  const [paso, setPaso] = useState("carga"); const [nombreArchivo, setNombreArchivo] = useState("");
  const [procesandoArchivo, setProcesandoArchivo] = useState(false); const [errorArchivo, setErrorArchivo] = useState("");
  const [encabezados, setEncabezados] = useState<string[]>([]); const [mapeoColumnas, setMapeoColumnas] = useState<Record<string, string>>({});
  const [notaImportacionEquivalencias, setNotaImportacionEquivalencias] = useState("");
  const [hojasDisponibles, setHojasDisponibles] = useState<string[]>([]); const [hojaActual, setHojaActual] = useState("");
  const [cambiandoHoja, setCambiandoHoja] = useState(false);
  async function cargarArchivo(evento: { target: HTMLInputElement }) {
    const archivo = evento.target.files?.[0]; if (!archivo) return false;
    setErrorArchivo(""); setProcesandoArchivo(true); setNombreArchivo(archivo.name);
    try {
      const formData = new FormData(); formData.append("archivo", archivo);
      const respuesta = await api.subirArchivo<{ nota_importacion_equivalencias?: string; encabezados: string[]; mapeo_sugerido: Record<string, string>; hoja_actual: string; hojas_disponibles: string[] }>("/recepcion/previsualizar", formData);
      if (!respuesta) throw new Error("Respuesta vacía del servidor.");
      setNotaImportacionEquivalencias(respuesta.nota_importacion_equivalencias || ""); setEncabezados(respuesta.encabezados); setMapeoColumnas(respuesta.mapeo_sugerido);
      setHojasDisponibles(respuesta.hojas_disponibles); setHojaActual(respuesta.hoja_actual);
      setPaso("mapeo"); return Boolean(respuesta.nota_importacion_equivalencias);
    } catch (err) { setErrorArchivo(err instanceof ErrorApi ? err.message : "No se pudo leer el archivo. Verifica que sea un Excel válido (.xlsx o .xls)."); return false; }
    finally { setProcesandoArchivo(false); evento.target.value = ""; }
  }
  function actualizarMapeoColumna(campo: string, encabezado: string) { setMapeoColumnas((actual) => ({ ...actual, [campo]: encabezado })); }
  async function cambiarHoja(hoja: string) {
    if (!hoja || hoja === hojaActual) return;
    setCambiandoHoja(true); setErrorArchivo("");
    try {
      const respuesta = await api.post<{ encabezados: string[]; mapeo_sugerido: Record<string, string>; hoja_actual: string; hojas_disponibles: string[] }>("/recepcion/hoja", { hoja });
      if (!respuesta) throw new Error("Respuesta vacía del servidor.");
      setEncabezados(respuesta.encabezados); setMapeoColumnas(respuesta.mapeo_sugerido);
      setHojasDisponibles(respuesta.hojas_disponibles); setHojaActual(respuesta.hoja_actual);
    } catch (err) { setErrorArchivo(err instanceof ErrorApi ? err.message : "No se pudo cambiar de hoja."); }
    finally { setCambiandoHoja(false); }
  }
  function reiniciarArchivo() { setPaso("carga"); setNombreArchivo(""); setErrorArchivo(""); setEncabezados([]); setMapeoColumnas({}); setNotaImportacionEquivalencias(""); setHojasDisponibles([]); setHojaActual(""); }
  return { paso, setPaso, nombreArchivo, procesandoArchivo, errorArchivo, cargarArchivo, encabezados, mapeoColumnas, actualizarMapeoColumna, notaImportacionEquivalencias,
    hojasDisponibles, hojaActual, cambiandoHoja, cambiarHoja,
    faltanCamposRequeridos: CAMPOS_REQUERIDOS_RECEPCION.some((campo) => !mapeoColumnas[campo]), reiniciarArchivo };
}
