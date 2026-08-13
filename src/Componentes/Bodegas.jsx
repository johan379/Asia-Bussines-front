import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ErrorApi } from "./Api";
import { productoDesdeApi, solicitudDesdeApi } from "./Mapeo";

const TIPOS_OPERACION = [
  { valor: "solicitud", etiqueta: "Solicitud" },
  { valor: "prestamo", etiqueta: "Préstamo" },
  { valor: "intercambio", etiqueta: "Intercambio" },
];

const FORM_SOLICITUD_VACIO = {
  cantidad: "",
  tipoOperacion: "solicitud",
  observaciones: "",
};

export function useControladorBodegas(sesion, almacen) {
  const _bodegaId = sesion?.bodegaId;
  const bodegasPorId = useMemo(
    () => Object.fromEntries((almacen?.bodegas || []).map((b) => [b.id, b.nombre])),
    [almacen?.bodegas]
  );

  // ---------- Paso 1: buscar y filtrar bodegas por nombre ----------
  const [busquedaBodegaInput, setBusquedaBodegaInput] = useState("");
  const [busquedaBodegaAplicada, setBusquedaBodegaAplicada] = useState("");
  const [bodegasFiltradas, setBodegasFiltradas] = useState([]);

  const buscarBodegas = useCallback(async (nombre) => {
    try {
      const datos = await api.get(`/bodegas?nombre=${encodeURIComponent(nombre || "")}`);
      setBodegasFiltradas(datos.map((b) => ({ id: b.id, nombre: b.nombre })));
    } catch {
      setBodegasFiltradas([]);
    }
  }, []);

  useEffect(() => {
    buscarBodegas(busquedaBodegaAplicada);
  }, [busquedaBodegaAplicada, buscarBodegas]);

  function aplicarFiltroBodega() {
    setBusquedaBodegaAplicada(busquedaBodegaInput);
  }

  // ---------- Paso 2: elegir una bodega y ver su inventario completo ----------
  const [bodegaSeleccionadaId, setBodegaSeleccionadaId] = useState(null);
  const [busquedaProductoBodega, setBusquedaProductoBodega] = useState("");
  const [inventarioBodegaSeleccionada, setInventarioBodegaSeleccionada] = useState([]);

  function seleccionarBodega(idBodega) {
    setBodegaSeleccionadaId(idBodega);
    setBusquedaProductoBodega("");
  }

  function limpiarSeleccionBodega() {
    setBodegaSeleccionadaId(null);
    setBusquedaProductoBodega("");
    setInventarioBodegaSeleccionada([]);
  }

  const bodegaSeleccionada = useMemo(
    () => bodegasFiltradas.find((b) => b.id === bodegaSeleccionadaId) || null,
    [bodegasFiltradas, bodegaSeleccionadaId]
  );

  useEffect(() => {
    if (!bodegaSeleccionadaId) return;
    (async () => {
      try {
        const parametros = new URLSearchParams();
        if (busquedaProductoBodega) parametros.set("busqueda", busquedaProductoBodega);
        const datos = await api.get(`/bodegas/${bodegaSeleccionadaId}/inventario?${parametros.toString()}`);
        setInventarioBodegaSeleccionada(
          datos.map((p) => ({ ...productoDesdeApi(p), bodegaNombre: bodegaSeleccionada?.nombre || "—" }))
        );
      } catch {
        setInventarioBodegaSeleccionada([]);
      }
    })();
  }, [bodegaSeleccionadaId, busquedaProductoBodega, bodegaSeleccionada]);

  // ---------- Formulario para solicitar un material ----------
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [formularioSolicitud, setFormularioSolicitud] = useState(FORM_SOLICITUD_VACIO);
  const [errorSolicitud, setErrorSolicitud] = useState("");
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  const [exitoSolicitud, setExitoSolicitud] = useState("");

  function abrirFormularioSolicitud(producto) {
    setProductoSeleccionado(producto);
    setFormularioSolicitud({
      ...FORM_SOLICITUD_VACIO,
      cantidad: producto.rolloId ? String(producto.stock) : "",
    });
    setErrorSolicitud("");
    setExitoSolicitud("");
  }

  function cerrarFormularioSolicitud() {
    setProductoSeleccionado(null);
    setErrorSolicitud("");
  }

  function actualizarCampoSolicitud(campo, valor) {
    setFormularioSolicitud((actual) => ({ ...actual, [campo]: valor }));
  }

  async function enviarSolicitud(evento) {
    evento.preventDefault();
    if (!productoSeleccionado) return;

    const cantidadNum = Number(formularioSolicitud.cantidad);
    if (!formularioSolicitud.cantidad || cantidadNum <= 0) {
      setErrorSolicitud("La cantidad debe ser mayor a cero.");
      return;
    }
    if (cantidadNum > productoSeleccionado.stock) {
      setErrorSolicitud("La cantidad supera la disponibilidad de esa bodega.");
      return;
    }

    setEnviandoSolicitud(true);
    setErrorSolicitud("");
    try {
      await api.post("/bodegas/solicitudes", {
        producto_id: productoSeleccionado.rolloId ? null : productoSeleccionado.id,
        rollo_id: productoSeleccionado.rolloId,
        cantidad: cantidadNum,
        tipo_operacion: formularioSolicitud.tipoOperacion,
        observaciones: formularioSolicitud.observaciones,
      });

      await cargarMisSolicitudesEnviadas();
      setExitoSolicitud(`Solicitud enviada a ${productoSeleccionado.bodegaNombre}.`);
      setProductoSeleccionado(null);
    } catch (err) {
      setErrorSolicitud(
        err instanceof ErrorApi ? err.message : "No se pudo enviar la solicitud. Intenta de nuevo."
      );
    } finally {
      setEnviandoSolicitud(false);
    }
  }

  // ---------- Notificaciones: solicitudes que me llegan a mí ----------
  const [solicitudesPendientesParaMi, setSolicitudesPendientesParaMi] = useState([]);

  const cargarSolicitudesPendientesParaMi = useCallback(async () => {
    try {
      const datos = await api.get("/bodegas/solicitudes/recibidas");
      setSolicitudesPendientesParaMi(datos.map((s) => solicitudDesdeApi(s, bodegasPorId)));
    } catch {
      setSolicitudesPendientesParaMi([]);
    }
  }, [bodegasPorId]);

  // ---------- Mis solicitudes enviadas ----------
  const [misSolicitudesEnviadas, setMisSolicitudesEnviadas] = useState([]);

  const cargarMisSolicitudesEnviadas = useCallback(async () => {
    try {
      const datos = await api.get("/bodegas/solicitudes/enviadas");
      setMisSolicitudesEnviadas(datos.map((s) => solicitudDesdeApi(s, bodegasPorId)));
    } catch {
      setMisSolicitudesEnviadas([]);
    }
  }, [bodegasPorId]);

  useEffect(() => {
    cargarSolicitudesPendientesParaMi();
    cargarMisSolicitudesEnviadas();
  }, [cargarSolicitudesPendientesParaMi, cargarMisSolicitudesEnviadas]);

  const [procesandoSolicitudId, setProcesandoSolicitudId] = useState(null);
  const [errorRespuesta, setErrorRespuesta] = useState("");

  async function aceptarSolicitud(idSolicitud) {
    setProcesandoSolicitudId(idSolicitud);
    setErrorRespuesta("");
    try {
      await api.patch(`/bodegas/solicitudes/${idSolicitud}/aceptar`);
      await Promise.all([
        cargarSolicitudesPendientesParaMi(),
        almacen?.refrescarSolicitudesPendientes?.(),
      ]);
    } catch (err) {
      setErrorRespuesta(
        err instanceof ErrorApi ? err.message : "No se pudo procesar la solicitud. Intenta de nuevo."
      );
    } finally {
      setProcesandoSolicitudId(null);
    }
  }

  async function rechazarSolicitud(idSolicitud) {
    setProcesandoSolicitudId(idSolicitud);
    setErrorRespuesta("");
    try {
      await api.patch(`/bodegas/solicitudes/${idSolicitud}/rechazar`);
      await Promise.all([
        cargarSolicitudesPendientesParaMi(),
        almacen?.refrescarSolicitudesPendientes?.(),
      ]);
    } catch (err) {
      setErrorRespuesta(
        err instanceof ErrorApi ? err.message : "No se pudo procesar la solicitud. Intenta de nuevo."
      );
    } finally {
      setProcesandoSolicitudId(null);
    }
  }

  return {
    busquedaBodegaInput,
    setBusquedaBodegaInput,
    aplicarFiltroBodega,
    bodegasFiltradas,

    bodegaSeleccionadaId,
    bodegaSeleccionada,
    seleccionarBodega,
    limpiarSeleccionBodega,

    inventarioBodegaSeleccionada,
    busquedaProductoBodega,
    setBusquedaProductoBodega,

    TIPOS_OPERACION,

    productoSeleccionado,
    formularioSolicitud,
    errorSolicitud,
    enviandoSolicitud,
    exitoSolicitud,
    abrirFormularioSolicitud,
    cerrarFormularioSolicitud,
    actualizarCampoSolicitud,
    enviarSolicitud,

    solicitudesPendientesParaMi,
    misSolicitudesEnviadas,
    procesandoSolicitudId,
    errorRespuesta,
    aceptarSolicitud,
    rechazarSolicitud,
  };
}
