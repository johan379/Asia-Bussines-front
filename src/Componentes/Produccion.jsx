import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ErrorApi } from "./Api";
import { produccionDesdeApi, rolloDesdeApi } from "./Mapeo";

function normalizarTexto(texto) {
  return (texto ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function redondear(numero, decimales = 2) {
  const factor = 10 ** decimales;
  return Math.round(numero * factor) / factor;
}

export function useControladorProduccion(sesion, _almacen) {
  const _bodegaId = sesion?.bodegaId;
  const puedeRegistrarProduccion = sesion?.rol === "jefe_planta";

  const [productoFabricado, setProductoFabricado] = useState("");
  const [modelo, setModelo] = useState("");
  const [medidaProducto, setMedidaProducto] = useState("");
  const [cantidadProductos, setCantidadProductos] = useState("");
  const [responsable, setResponsable] = useState("");

  const [codigoBusqueda, setCodigoBusqueda] = useState("");
  const [rollosDeMiBodega, setRollosDeMiBodega] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const datos = await api.get("/rollos");
        setRollosDeMiBodega(datos.map(rolloDesdeApi));
      } catch {
        setRollosDeMiBodega([]);
      }
    })();
  }, []);

  const rollosDisponibles = useMemo(() => {
    const termino = normalizarTexto(codigoBusqueda);
    if (!termino) return [];
    return rollosDeMiBodega.filter((r) => normalizarTexto(r.codigoInterno).includes(termino));
  }, [rollosDeMiBodega, codigoBusqueda]);

  const [seleccion, setSeleccion] = useState({});

  function alternarSeleccionRollo(rollo) {
    setSeleccion((actual) => {
      const actualDeEste = actual[rollo.id];
      if (actualDeEste?.seleccionado) {
        const { [rollo.id]: _quitado, ...resto } = actual;
        return resto;
      }
      return { ...actual, [rollo.id]: { seleccionado: true, metrosTexto: "" } };
    });
  }

  function actualizarMetrosRollo(idRollo, valor) {
    setSeleccion((actual) => ({
      ...actual,
      [idRollo]: { ...actual[idRollo], metrosTexto: valor },
    }));
  }

  const rollosSeleccionados = useMemo(() => {
    return rollosDisponibles
      .filter((r) => seleccion[r.id]?.seleccionado)
      .map((r) => ({ rollo: r, metrosTexto: seleccion[r.id]?.metrosTexto ?? "" }));
  }, [rollosDisponibles, seleccion]);

  const totalMetrosAConsumir = useMemo(() => {
    return redondear(
      rollosSeleccionados.reduce((suma, item) => suma + (Number(item.metrosTexto) || 0), 0)
    );
  }, [rollosSeleccionados]);

  const [errorValidacion, setErrorValidacion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [produccionConfirmada, setProduccionConfirmada] = useState(null);

  function validar() {
    if (!codigoBusqueda.trim()) return "Busca un código de clasificación.";
    if (rollosDisponibles.length === 0) return "No hay rollos registrados con ese código en tu bodega.";
    if (rollosSeleccionados.length === 0) return "Selecciona al menos un rollo y sus metros a consumir.";
    for (const { rollo, metrosTexto } of rollosSeleccionados) {
      const metros = Number(metrosTexto);
      if (rollo.estado === "agotado") {
        return `El rollo ${rollo.identificadorRollo} ya está acabado y no puede usarse.`;
      }
      if (!metrosTexto || !(metros > 0)) {
        return `Ingresa una cantidad válida de metros para el rollo ${rollo.identificadorRollo}.`;
      }
      if (metros > rollo.metrosDisponibles) {
        return `El rollo ${rollo.identificadorRollo} solo tiene ${rollo.metrosDisponibles} m disponibles.`;
      }
    }
    if (!modelo.trim()) return "Indica el modelo del producto fabricado.";
    if (!medidaProducto.trim()) return "Indica la medida del producto fabricado.";
    if (!cantidadProductos || Number(cantidadProductos) <= 0) {
      return "Indica cuántas unidades de producto se obtuvieron.";
    }
    if (!responsable.trim()) return "Indica quién es el responsable de esta producción.";
    return "";
  }

  const [observaciones, setObservaciones] = useState("");

  async function registrarProduccion(evento) {
    evento.preventDefault();
    if (!puedeRegistrarProduccion) {
      setErrorValidacion("Tu usuario no tiene permiso para registrar producción.");
      return;
    }
    const mensajeError = validar();
    if (mensajeError) {
      setErrorValidacion(mensajeError);
      return;
    }

    setGuardando(true);
    setErrorValidacion("");
    try {
      const cuerpo = {
        producto_fabricado: productoFabricado.trim(),
        modelo: modelo.trim(),
        medida_producto: medidaProducto.trim(),
        cantidad_productos: Number(cantidadProductos),
        responsable: responsable.trim(),
        observaciones,
        rollos: rollosSeleccionados.map(({ rollo, metrosTexto }) => ({
          rollo_id: rollo.id,
          metros: Number(metrosTexto),
        })),
      };

      const respuesta = await api.post("/produccion", cuerpo);
      const registro = produccionDesdeApi(respuesta);

      setProduccionesRegistradas((actual) => [registro, ...actual]);
      setProduccionConfirmada(registro);
      setSeleccion({});

      const datosRollos = await api.get("/rollos");
      setRollosDeMiBodega(datosRollos.map(rolloDesdeApi));
    } catch (err) {
      setErrorValidacion(
        err instanceof ErrorApi ? err.message : "No se pudo registrar la producción. Intenta de nuevo."
      );
    } finally {
      setGuardando(false);
    }
  }

  function cancelar() {
    setProductoFabricado("");
    setModelo("");
    setMedidaProducto("");
    setCantidadProductos("");
    setResponsable("");
    setCodigoBusqueda("");
    setSeleccion({});
    setObservaciones("");
    setErrorValidacion("");
  }

  function iniciarNuevoRegistro() {
    cancelar();
    setProduccionConfirmada(null);
  }

  const [produccionesRegistradas, setProduccionesRegistradas] = useState([]);

  const cargarProducciones = useCallback(async () => {
    try {
      const datos = await api.get("/produccion");
      setProduccionesRegistradas(datos.map(produccionDesdeApi));
    } catch {
      setProduccionesRegistradas([]);
    }
  }, []);

  useEffect(() => {
    cargarProducciones();
  }, [cargarProducciones]);

  const misProducciones = produccionesRegistradas;

  return {
    puedeRegistrarProduccion,

    productoFabricado,
    setProductoFabricado,
    modelo,
    setModelo,
    medidaProducto,
    setMedidaProducto,
    cantidadProductos,
    setCantidadProductos,
    responsable,
    setResponsable,

    codigoBusqueda,
    setCodigoBusqueda,
    rollosDisponibles,

    seleccion,
    alternarSeleccionRollo,
    actualizarMetrosRollo,
    rollosSeleccionados,
    totalMetrosAConsumir,

    observaciones,
    setObservaciones,

    errorValidacion,
    guardando,
    registrarProduccion,
    cancelar,

    produccionConfirmada,
    iniciarNuevoRegistro,

    misProducciones,
  };
}
