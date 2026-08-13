import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./Api";
import { movimientoDesdeApi, productoDesdeApi } from "./Mapeo";

const FILTROS_VACIOS = {
  tipo: "",
  codigoProducto: "",
  fechaDesde: "",
  fechaHasta: "",
};

export function useControladorReportes(_sesion, _almacen) {
  const [movimientos, setMovimientos] = useState([]);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(true);
  const [errorMovimientos, setErrorMovimientos] = useState("");
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [pagina, setPagina] = useState(1);
  const [paginacion, setPaginacion] = useState({ total: 0, pagina: 1, total_paginas: 1 });

  const [productos, setProductos] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);

  function actualizarFiltro(campo, valor) {
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
      if (filtros.tipo) parametros.set("tipo", filtros.tipo);
      if (filtros.fechaDesde) parametros.set("fecha_desde", filtros.fechaDesde);
      if (filtros.fechaHasta) parametros.set("fecha_hasta", filtros.fechaHasta);
      parametros.set("paginado", "true");
      parametros.set("pagina", String(pagina));
      parametros.set("tamano", "30");

      const datos = await api.get(`/inventario/historial?${parametros.toString()}`);
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

  const cargarProductos = useCallback(async () => {
    setCargandoProductos(true);
    try {
      const datos = await api.get("/inventario/productos");
      setProductos(datos.map(productoDesdeApi));
    } catch {
      setProductos([]);
    } finally {
      setCargandoProductos(false);
    }
  }, []);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

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

  // ---------- Alerta de stock: productos agotados o casi agotados ----------
  const productosAgotados = useMemo(() => productos.filter((p) => p.stock <= 0), [productos]);

  const productosStockBajo = useMemo(
    () => productos.filter((p) => p.stock > 0 && p.stock <= 10),
    [productos]
  );

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

    productosAgotados,
    productosStockBajo,
    cargandoProductos,
  };
}
