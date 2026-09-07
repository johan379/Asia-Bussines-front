import { useState } from "react";
import { api, ErrorApi } from "../Componentes/Api";

type RespuestaCargaExcel = {
  encabezados: string[]; mapeo_sugerido: Record<string, string>;
  hoja_actual: string; hojas_disponibles: string[];
};

/** Carga masiva por Excel, genérica: subir → mapear → confirmar.
 * Comparte la lógica entre los flujos de carga de productos y de rollos
 * existentes — cada uno pasa su propia ruta base y campos requeridos. */
export function useCargaMasivaExcel({
  rutaBase, camposRequeridos, alRecargar,
}: { rutaBase: string; camposRequeridos: string[]; alRecargar: () => Promise<void> }) {
  const [paso, setPaso] = useState("carga");
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [procesandoArchivo, setProcesandoArchivo] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState("");
  const [encabezados, setEncabezados] = useState<string[]>([]);
  const [mapeoColumnas, setMapeoColumnas] = useState<Record<string, string>>({});
  const [hojasDisponibles, setHojasDisponibles] = useState<string[]>([]);
  const [hojaActual, setHojaActual] = useState("");
  const [cambiandoHoja, setCambiandoHoja] = useState(false);
  const [confirmandoCarga, setConfirmandoCarga] = useState(false);
  const [errorConfirmacionCarga, setErrorConfirmacionCarga] = useState("");
  const [resultadoCarga, setResultadoCarga] = useState<Record<string, unknown> | null>(null);

  async function cargarArchivo(evento: { target: HTMLInputElement }) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    setErrorArchivo("");
    setProcesandoArchivo(true);
    setNombreArchivo(archivo.name);
    try {
      const formData = new FormData();
      formData.append("archivo", archivo);
      const respuesta = await api.subirArchivo<{
        encabezados: string[]; mapeo_sugerido: Record<string, string>;
        hoja_actual: string; hojas_disponibles: string[];
      }>(`${rutaBase}/previsualizar`, formData);
      if (!respuesta) throw new Error("Respuesta vacía del servidor.");
      setEncabezados(respuesta.encabezados);
      setMapeoColumnas(respuesta.mapeo_sugerido);
      setHojasDisponibles(respuesta.hojas_disponibles);
      setHojaActual(respuesta.hoja_actual);
      setPaso("mapeo");
    } catch (err) {
      setErrorArchivo(
        err instanceof ErrorApi ? err.message : "No se pudo leer el archivo. Verifica que sea un Excel válido (.xlsx o .xls)."
      );
    } finally {
      setProcesandoArchivo(false);
      evento.target.value = "";
    }
  }

  async function cambiarHoja(hoja: string) {
    if (!hoja || hoja === hojaActual) return;
    setCambiandoHoja(true);
    setErrorArchivo("");
    try {
      const respuesta = await api.post<RespuestaCargaExcel>(`${rutaBase}/hoja`, { hoja });
      if (!respuesta) throw new Error("Respuesta vacía del servidor.");
      setEncabezados(respuesta.encabezados);
      setMapeoColumnas(respuesta.mapeo_sugerido);
      setHojasDisponibles(respuesta.hojas_disponibles);
      setHojaActual(respuesta.hoja_actual);
    } catch (err) {
      setErrorArchivo(err instanceof ErrorApi ? err.message : "No se pudo cambiar de hoja.");
    } finally {
      setCambiandoHoja(false);
    }
  }

  function actualizarMapeoColumna(campo: string, encabezado: string) {
    setMapeoColumnas((actual) => ({ ...actual, [campo]: encabezado }));
  }

  async function confirmarCarga() {
    setConfirmandoCarga(true);
    setErrorConfirmacionCarga("");
    try {
      const respuesta = await api.post<Record<string, unknown>>(`${rutaBase}/confirmar`, { mapeo: mapeoColumnas });
      if (!respuesta) throw new Error("Respuesta vacía del servidor.");
      setResultadoCarga(respuesta);
      setPaso("resultado");
      await alRecargar();
    } catch (err) {
      setErrorConfirmacionCarga(
        err instanceof ErrorApi ? err.message : "No se pudo confirmar la carga. Intenta de nuevo."
      );
    } finally {
      setConfirmandoCarga(false);
    }
  }

  function reiniciarCarga() {
    setPaso("carga");
    setNombreArchivo("");
    setErrorArchivo("");
    setEncabezados([]);
    setMapeoColumnas({});
    setHojasDisponibles([]);
    setHojaActual("");
    setErrorConfirmacionCarga("");
    setResultadoCarga(null);
  }

  return {
    paso, nombreArchivo, procesandoArchivo, errorArchivo, cargarArchivo,
    encabezados, mapeoColumnas, hojasDisponibles, hojaActual, cambiandoHoja, cambiarHoja,
    actualizarMapeoColumna,
    faltanCamposRequeridos: camposRequeridos.some((campo) => !mapeoColumnas[campo]),
    confirmandoCarga, errorConfirmacionCarga, confirmarCarga, resultadoCarga, reiniciarCarga,
  };
}
