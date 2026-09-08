import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./Api";
import { movimientoDesdeApi, productoDesdeApi } from "./Mapeo";

const FILTROS_VACIOS = {
  tipo: "",
  codigoProducto: "",
  codigoRollo: "",
  cotizacion: "",
  empresaExterna: "",
  fechaDesde: "",
  fechaHasta: "",
};

type Filtros = typeof FILTROS_VACIOS;
type PaginaApi = { items: Record<string, unknown>[]; total: number; pagina: number; total_paginas: number };

export function useControladorReportes(_sesion: unknown, _almacen: unknown) {
  const [movimientos, setMovimientos] = useState<ReturnType<typeof movimientoDesdeApi>[]>([]);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(true);
  const [errorMovimientos, setErrorMovimientos] = useState("");
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [pagina, setPagina] = useState(1);
  const [paginacion, setPaginacion] = useState<{ total: number; pagina: number; total_paginas: number }>({ total: 0, pagina: 1, total_paginas: 1 });

  const [alertasStock, setAlertasStock] = useState<ReturnType<typeof productoDesdeApi>[]>([]);
  const [cargandoAlertasStock, setCargandoAlertasStock] = useState(true);

  function actualizarFiltro(campo: keyof Filtros, valor: string) {
    setFiltros((actual) => ({ ...actual, [campo]: valor }));
    setPagina(1);
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_VACIOS);
    setPagina(1);
  }

  const cargarMovimientos = useCallback(async () => {
    setCargandoMovimientos(true);
    setErrorMovimientos("");
    try {
      const parametros = new URLSearchParams();
      if (filtros.codigoProducto) parametros.set("codigo_producto", filtros.codigoProducto);
      if (filtros.codigoRollo) parametros.set("codigo_rollo", filtros.codigoRollo);
      if (filtros.cotizacion) parametros.set("cotizacion", filtros.cotizacion);
      if (filtros.empresaExterna) parametros.set("empresa_externa", filtros.empresaExterna);
      if (filtros.tipo) parametros.set("tipo", filtros.tipo);
      if (filtros.fechaDesde) parametros.set("fecha_desde", filtros.fechaDesde);
      if (filtros.fechaHasta) parametros.set("fecha_hasta", filtros.fechaHasta);
      parametros.set("paginado", "true");
      parametros.set("pagina", String(pagina));
      parametros.set("tamano", "30");

      const datos = await api.get<PaginaApi>(`/inventario/historial?${parametros.toString()}`);
      if (!datos) throw new Error("Respuesta vacía del servidor.");
      setMovimientos(datos.items.map(movimientoDesdeApi));
      setPaginacion(datos);
    } catch {
      setErrorMovimientos("No se pudo cargar el historial de movimientos.");
    } finally {
      setCargandoMovimientos(false);
    }
  }, [filtros, pagina]);

  useEffect(() => {
    cargarMovimientos();
  }, [cargarMovimientos]);

  // Mismo criterio y misma fuente que la campana de Inventario: solo alertan
  // los productos con `stockMinimo` configurado y por debajo de ese umbral —
  // un producto sin configurar no genera alerta en ningún lado.
  const cargarAlertasStock = useCallback(async () => {
    setCargandoAlertasStock(true);
    try {
      const datos = await api.get<Record<string, unknown>[]>("/inventario/productos/alertas");
      setAlertasStock((datos || []).map(productoDesdeApi));
    } catch {
      setAlertasStock([]);
    } finally {
      setCargandoAlertasStock(false);
    }
  }, []);

  useEffect(() => {
    cargarAlertasStock();
  }, [cargarAlertasStock]);

  const movimientosFiltrados = movimientos;

  const resumen = useMemo(() => {
    return {
      entradas: movimientos.filter((m) => m.tipo === "entrada").length,
      salidas: movimientos.filter((m) => m.tipo === "salida").length,
      traslados: movimientos.filter((m) => m.tipo === "traslado").length,
      transferencias: movimientos.filter((m) => m.tipo === "transferencia").length,
      metrosOCantidadEntrada: movimientos
        .filter((m) => m.tipo === "entrada")
        .reduce((suma, m) => suma + m.cantidad, 0),
      metrosOCantidadSalida: movimientos
        .filter((m) => m.tipo === "salida")
        .reduce((suma, m) => suma + m.cantidad, 0),
    };
  }, [movimientos]);

  return {
    movimientos: movimientosFiltrados,
    cargandoMovimientos,
    errorMovimientos,
    filtros,
    actualizarFiltro,
    limpiarFiltros,
    resumen,
    pagina,
    setPagina,
    paginacion,

    alertasStock,
    cargandoAlertasStock,
  };
}
