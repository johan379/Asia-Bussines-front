import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ErrorApi } from "./Api";
import { rolloDesdeApi } from "./Mapeo";

export const ESTADOS_ROLLO = {
  cerrado: "Cerrado",
  abierto: "Abierto",
  agotado: "Agotado",
};

const FILTROS_VACIOS = {
  codigoInterno: "",
  codigoProveedor: "",
  descripcion: "",
  familia: "",
  colorMaterial: "",
  calibre: "",
  estado: "",
  fechaDesde: "",
  fechaHasta: "",
};

export function useControladorRollos(_sesion, _almacen) {
  const ultimaConsulta = useRef(0);
  const [misRollos, setMisRollos] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [pagina, setPagina] = useState(1);
  const [paginacion, setPaginacion] = useState({ total: 0, pagina: 1, total_paginas: 1 });

  function actualizarFiltro(campo, valor) {
    setFiltros((actual) => ({ ...actual, [campo]: valor }));
    setPagina(1);
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_VACIOS);
    setPagina(1);
  }

  const cargarRollos = useCallback(async () => {
    const consultaActual = ++ultimaConsulta.current;
    try {
      const parametros = new URLSearchParams();
      if (filtros.codigoInterno) parametros.set("codigo_interno", filtros.codigoInterno);
      if (filtros.codigoProveedor) parametros.set("codigo_proveedor", filtros.codigoProveedor);
      if (filtros.descripcion) parametros.set("descripcion", filtros.descripcion);
      if (filtros.familia) parametros.set("familia", filtros.familia);
      if (filtros.colorMaterial) parametros.set("color_material", filtros.colorMaterial);
      if (filtros.calibre) parametros.set("calibre", filtros.calibre);
      if (filtros.estado) parametros.set("estado", filtros.estado);
      if (filtros.fechaDesde) parametros.set("fecha_desde", filtros.fechaDesde);
      if (filtros.fechaHasta) parametros.set("fecha_hasta", `${filtros.fechaHasta}T23:59:59`);
      parametros.set("paginado", "true");
      parametros.set("pagina", String(pagina));
      parametros.set("tamano", "30");

      const datos = await api.get(`/rollos?${parametros.toString()}`);
      if (consultaActual !== ultimaConsulta.current) return;
      setMisRollos(datos.items.map(rolloDesdeApi));
      setPaginacion(datos);
    } catch {
      if (consultaActual !== ultimaConsulta.current) return;
      setMisRollos([]);
    }
  }, [filtros, pagina]);

  useEffect(() => {
    cargarRollos();
  }, [cargarRollos]);

  const rollosFiltrados = misRollos;

  const gruposPorCodigo = useMemo(() => {
    const mapa = new Map();
    for (const rollo of rollosFiltrados) {
      if (!mapa.has(rollo.codigoInterno)) {
        mapa.set(rollo.codigoInterno, {
          codigoInterno: rollo.codigoInterno,
          colorMaterial: rollo.colorMaterial,
          calibre: rollo.calibre,
          familia: rollo.familia,
          rollos: [],
        });
      }
      mapa.get(rollo.codigoInterno).rollos.push(rollo);
    }
    return Array.from(mapa.values()).sort((a, b) => a.codigoInterno.localeCompare(b.codigoInterno));
  }, [rollosFiltrados]);

  const familiasDisponibles = useMemo(
    () => [...new Set(misRollos.map((r) => r.familia))].filter(Boolean),
    [misRollos]
  );

  const coloresDisponibles = useMemo(
    () => [...new Set(misRollos.map((r) => r.colorMaterial))].filter(Boolean),
    [misRollos]
  );

  const [rolloParaConsumo, setRolloParaConsumo] = useState(null);
  const [cantidadConsumo, setCantidadConsumo] = useState("");
  const [observacionesConsumo, setObservacionesConsumo] = useState("");
  const [errorConsumo, setErrorConsumo] = useState("");
  const [guardandoConsumo, setGuardandoConsumo] = useState(false);

  function abrirConsumo(rollo) {
    setRolloParaConsumo(rollo);
    setCantidadConsumo("");
    setObservacionesConsumo("");
    setErrorConsumo("");
  }

  function cerrarConsumo() {
    setRolloParaConsumo(null);
    setErrorConsumo("");
  }

  async function registrarConsumo(evento) {
    evento.preventDefault();
    if (!rolloParaConsumo) return;

    const cantidad = Number(cantidadConsumo);
    if (!cantidadConsumo || cantidad <= 0) {
      setErrorConsumo("La cantidad debe ser mayor a cero.");
      return;
    }
    if (cantidad > rolloParaConsumo.metrosDisponibles) {
      setErrorConsumo(`Ese rollo solo tiene ${rolloParaConsumo.metrosDisponibles} m disponibles.`);
      return;
    }

    setGuardandoConsumo(true);
    setErrorConsumo("");
    try {
      await api.post(`/rollos/${rolloParaConsumo.id}/consumo`, {
        cantidad,
        observaciones: observacionesConsumo,
      });

      await cargarRollos();
      setRolloParaConsumo(null);
    } catch (err) {
      setErrorConsumo(
        err instanceof ErrorApi ? err.message : "No se pudo registrar el consumo. Intenta de nuevo."
      );
    } finally {
      setGuardandoConsumo(false);
    }
  }

  async function actualizarObservacionesRollo(idRollo, texto) {
    try {
      await api.patch(`/rollos/${idRollo}/observaciones`, { observaciones: texto });
      setMisRollos((actual) =>
        actual.map((r) => (r.id === idRollo ? { ...r, observaciones: texto } : r))
      );
    } catch {
      // Si falla, el texto simplemente no queda guardado.
    }
  }

  return {
    rollosFiltrados,
    gruposPorCodigo,
    familiasDisponibles,
    coloresDisponibles,
    ESTADOS_ROLLO,

    filtros,
    actualizarFiltro,
    limpiarFiltros,
    pagina,
    setPagina,
    paginacion,

    rolloParaConsumo,
    cantidadConsumo,
    setCantidadConsumo,
    observacionesConsumo,
    setObservacionesConsumo,
    errorConsumo,
    guardandoConsumo,
    abrirConsumo,
    cerrarConsumo,
    registrarConsumo,

    actualizarObservacionesRollo,
  };
}
