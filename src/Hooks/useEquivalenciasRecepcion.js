import { useCallback, useEffect, useState } from "react";
import { api } from "../Componentes/Api";
import { redondearRecepcion } from "../Utils/recepcion.js";

/** Administración aislada de las tablas que clasifican materiales recibidos. */
export function useEquivalenciasRecepcion() {
  const [tablaColores, setTablaColores] = useState([]);
  const [tablaTipos, setTablaTipos] = useState([]);
  const [tablaEspesor, setTablaEspesor] = useState([]);
  const cargarEquivalencias = useCallback(async () => {
    try {
      const datos = await api.get("/recepcion/equivalencias");
      setTablaColores(datos.colores.map((item) => ({ ral: item.ral, nombre: item.nombre, codigoInterno: item.codigo_interno })));
      setTablaTipos(datos.tipos.map((item) => ({ nombre: item.nombre, codigoInterno: item.codigo_interno })));
      setTablaEspesor(datos.espesores.map((item) => ({ espesor: item.espesor, mtPorTon: item.mt_por_ton, pesoPorMetro: item.peso_por_metro })));
    } catch { /* El panel puede reintentarse sin interrumpir la recepción. */ }
  }, []);
  useEffect(() => { cargarEquivalencias(); }, [cargarEquivalencias]);
  async function guardar(ruta, cuerpo) { await api.post(ruta, cuerpo); await cargarEquivalencias(); }
  async function agregarEquivalenciaColor(ral, nombre, codigoInterno) {
    const codigo = (codigoInterno ?? "").trim().toUpperCase() || (nombre ?? "").trim().charAt(0).toUpperCase();
    if (!ral || !codigo) return false;
    try { await guardar("/recepcion/equivalencias/colores", { ral, nombre, codigo_interno: codigo }); return true; } catch { return false; }
  }
  async function agregarEquivalenciaTipo(nombre, codigoInterno) {
    if (!nombre || !codigoInterno) return false;
    try { await guardar("/recepcion/equivalencias/tipos", { nombre, codigo_interno: codigoInterno }); return true; } catch { return false; }
  }
  async function agregarEquivalenciaEspesor(espesorTexto, { mtPorTonTexto, pesoPorMetroTexto }) {
    const espesor = Number(espesorTexto); let mtPorTon = mtPorTonTexto ? Number(mtPorTonTexto) : null; let pesoPorMetro = pesoPorMetroTexto ? Number(pesoPorMetroTexto) : null;
    if (!Number.isFinite(espesor)) return false;
    if (!mtPorTon && pesoPorMetro) mtPorTon = redondearRecepcion(1000 / pesoPorMetro);
    if (!pesoPorMetro && mtPorTon) pesoPorMetro = redondearRecepcion(1000 / mtPorTon);
    if (!mtPorTon || !pesoPorMetro) return false;
    try { await guardar("/recepcion/equivalencias/espesor", { espesor, mt_por_ton: mtPorTon, peso_por_metro: pesoPorMetro }); return true; } catch { return false; }
  }
  return { tablaColores, tablaTipos, tablaEspesor, cargarEquivalencias, agregarEquivalenciaColor, agregarEquivalenciaTipo, agregarEquivalenciaEspesor };
}
