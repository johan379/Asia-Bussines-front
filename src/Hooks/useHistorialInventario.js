import { useCallback, useEffect, useState } from "react";
import { api } from "../Componentes/Api";
import { movimientoDesdeApi } from "../Componentes/Mapeo";

const FILTROS_VACIOS = { codigoProducto: "", fechaDesde: "", fechaHasta: "" };

/** Consulta, filtros y paginación del historial; no depende de la interfaz. */
export function useHistorialInventario(bodegaId) {
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [errorHistorial, setErrorHistorial] = useState("");
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [paginaHistorial, setPaginaHistorial] = useState(1);
  const [paginacionHistorial, setPaginacionHistorial] = useState({ total: 0, pagina: 1, total_paginas: 1 });

  const cargarHistorial = useCallback(async () => {
    setCargandoHistorial(true);
    setErrorHistorial("");
    try {
      const parametros = new URLSearchParams({ paginado: "true", pagina: String(paginaHistorial), tamano: "30" });
      if (filtros.codigoProducto) parametros.set("codigo_producto", filtros.codigoProducto);
      if (filtros.fechaDesde) parametros.set("fecha_desde", filtros.fechaDesde);
      if (filtros.fechaHasta) parametros.set("fecha_hasta", filtros.fechaHasta);
      const datos = await api.get(`/inventario/historial?${parametros.toString()}`);
      // Defensa adicional en UI: aunque la API ya limita por sesión, nunca se
      // muestra un movimiento ajeno si una respuesta inesperada llegara aquí.
      const movimientosDeMiBodega = datos.items
        .map(movimientoDesdeApi)
        .filter((movimiento) =>
          movimiento.bodegaOrigenId === bodegaId || movimiento.bodegaDestinoId === bodegaId
        );
      setHistorial(movimientosDeMiBodega);
      setPaginacionHistorial(datos);
    } catch {
      setErrorHistorial("No se pudo cargar el historial.");
    } finally {
      setCargandoHistorial(false);
    }
  }, [bodegaId, filtros, paginaHistorial]);

  useEffect(() => { cargarHistorial(); }, [cargarHistorial]);

  function actualizarFiltro(campo, valor) {
    setFiltros((actual) => ({ ...actual, [campo]: valor }));
    setPaginaHistorial(1);
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_VACIOS);
    setPaginaHistorial(1);
  }

  return {
    historial, cargandoHistorial, errorHistorial, filtros, actualizarFiltro, limpiarFiltros,
    cargarHistorial, paginaHistorial, setPaginaHistorial, paginacionHistorial,
  };
}
