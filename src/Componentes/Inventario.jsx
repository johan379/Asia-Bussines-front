import { useMemo, useState } from "react";

// TODO: cuando exista el backend, reemplazar todo este estado en memoria por
// llamadas reales a la API (GET/POST/PUT/DELETE /api/productos,
// /api/movimientos, etc.). Por ahora se simula igual que en Inicio.jsx.

const BODEGAS_DEMO = [
  { id: 1, nombre: "Bodega Central" },
  { id: 2, nombre: "Bodega Norte" },
];

const PRODUCTOS_DEMO = [
  {
    id: 1,
    codigoImportacion: "IMP-001",
    codigo: "TEL-001",
    descripcion: "Tela X",
    calibre: "20",
    entrada: 500,
    stock: 320,
  },
  {
    id: 2,
    codigoImportacion: "IMP-002",
    codigo: "TEL-002",
    descripcion: "Tela Y",
    calibre: "18",
    entrada: 300,
    stock: 150,
  },
];

export const MOTIVOS_ENTRADA = [
  { valor: "compra_proveedor", etiqueta: "Compra a proveedor" },
  { valor: "devolucion", etiqueta: "Devolución" },
  { valor: "ajuste_inventario", etiqueta: "Ajuste de inventario" },
  { valor: "transferencia_recibida", etiqueta: "Transferencia recibida" },
];

export const MOTIVOS_SALIDA = [
  { valor: "venta", etiqueta: "Venta" },
  { valor: "produccion", etiqueta: "Uso en producción" },
  { valor: "merma", etiqueta: "Merma o daño" },
  { valor: "transferencia_enviada", etiqueta: "Transferencia enviada" },
];

const FORM_PRODUCTO_VACIO = {
  codigoImportacion: "",
  codigo: "",
  descripcion: "",
  calibre: "",
  entrada: "",
  stock: "",
};

const FORM_MOV_VACIO = {
  tipo: "entrada",
  motivo: "",
  productoId: "",
  bodegaOrigenId: "",
  bodegaDestinoId: "",
  cantidad: "",
  observaciones: "",
};

const FILTROS_VACIOS = {
  codigoProducto: "",
  bodegaId: "",
  fechaDesde: "",
  fechaHasta: "",
};

let siguienteIdProducto = PRODUCTOS_DEMO.length + 1;
let siguienteIdMovimiento = 1;
let siguienteNumeroCotizacion = 1;

// Genera automáticamente el número de cotización de cada movimiento, con el
// formato COT-AÑO-#### (ej. COT-2026-0001). Cuando exista backend, esto debería
// venir del servidor para garantizar que el consecutivo sea único entre usuarios.
function generarNumeroCotizacion() {
  const anio = new Date().getFullYear();
  const consecutivo = String(siguienteNumeroCotizacion++).padStart(4, "0");
  return `COT-${anio}-${consecutivo}`;
}

// Hook principal del módulo Inventario. Maneja Productos, Movimientos e Historial,
// todo en memoria mientras no exista el backend real.
export function useControladorInventario() {
  // ---------- Productos ----------
  const [productos, setProductos] = useState(PRODUCTOS_DEMO);
  const [cargandoProductos] = useState(false);
  const [errorProductos, setErrorProductos] = useState("");
  const [guardandoProducto, setGuardandoProducto] = useState(false);
  const [formularioProducto, setFormularioProducto] = useState(FORM_PRODUCTO_VACIO);
  const [editandoProductoId, setEditandoProductoId] = useState(null);
  const [mostrarFormularioProducto, setMostrarFormularioProducto] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");

  // Actualiza un solo campo del formulario de producto mientras el usuario escribe.
  function actualizarCampoProducto(campo, valor) {
    setFormularioProducto((actual) => ({ ...actual, [campo]: valor }));
  }

  // Abre el formulario vacío para crear un producto nuevo.
  function abrirFormularioNuevoProducto() {
    setFormularioProducto(FORM_PRODUCTO_VACIO);
    setEditandoProductoId(null);
    setErrorProductos("");
    setMostrarFormularioProducto(true);
  }

  // Abre el formulario ya lleno con los datos de un producto existente, para editarlo.
  function abrirFormularioEdicionProducto(producto) {
    setFormularioProducto({
      codigoImportacion: producto.codigoImportacion,
      codigo: producto.codigo,
      descripcion: producto.descripcion,
      calibre: producto.calibre,
      entrada: producto.entrada,
      stock: producto.stock,
    });
    setEditandoProductoId(producto.id);
    setErrorProductos("");
    setMostrarFormularioProducto(true);
  }

  // Cierra el formulario de producto sin guardar cambios.
  function cerrarFormularioProducto() {
    setMostrarFormularioProducto(false);
    setEditandoProductoId(null);
    setErrorProductos("");
  }

  // Valida y guarda el producto: si estaba editando actualiza, si no, crea uno nuevo.
  async function guardarProducto(evento) {
    evento.preventDefault();
    if (!formularioProducto.codigo.trim() || !formularioProducto.descripcion.trim()) {
      setErrorProductos("Código y descripción son obligatorios.");
      return;
    }

    setGuardandoProducto(true);
    setErrorProductos("");
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));

      if (editandoProductoId) {
        setProductos((actual) =>
          actual.map((p) =>
            p.id === editandoProductoId ? { ...p, ...formularioProducto } : p
          )
        );
      } else {
        const nuevo = {
          id: siguienteIdProducto++,
          ...formularioProducto,
        };
        setProductos((actual) => [...actual, nuevo]);
      }

      setMostrarFormularioProducto(false);
      setEditandoProductoId(null);
    } catch (err) {
      setErrorProductos("No se pudo guardar el producto. Intenta de nuevo.");
    } finally {
      setGuardandoProducto(false);
    }
  }

  // Borra un producto de la lista por su id.
  function eliminarProducto(id) {
    setProductos((actual) => actual.filter((p) => p.id !== id));
  }

  // Filtra los productos según lo escrito en el buscador (código, código de importación o descripción).
  // useMemo evita recalcular el filtro en cada render si nada cambió.
  const productosFiltrados = useMemo(() => {
    const termino = busquedaProducto.trim().toLowerCase();
    if (!termino) return productos;
    return productos.filter(
      (p) =>
        p.codigo.toLowerCase().includes(termino) ||
        p.codigoImportacion.toLowerCase().includes(termino) ||
        p.descripcion.toLowerCase().includes(termino)
    );
  }, [productos, busquedaProducto]);

  // ---------- Movimientos ----------
  const [bodegas] = useState(BODEGAS_DEMO);
  const [cargandoOpcionesMov] = useState(false);
  const [formularioMov, setFormularioMov] = useState(FORM_MOV_VACIO);
  const [errorMov, setErrorMov] = useState("");
  const [exitoMov, setExitoMov] = useState("");
  const [guardandoMov, setGuardandoMov] = useState(false);
  const [historial, setHistorial] = useState([]);

  // Actualiza un solo campo del formulario de movimiento (entrada/salida/traslado).
  function actualizarCampoMov(campo, valor) {
    setFormularioMov((actual) => ({ ...actual, [campo]: valor }));
  }

  // Cambia el tipo de movimiento (entrada, salida o traslado) y limpia el formulario.
  function cambiarTipoMov(tipo) {
    setFormularioMov((actual) => ({
      ...FORM_MOV_VACIO,
      tipo,
    }));
    setErrorMov("");
    setExitoMov("");
  }

  // Valida y guarda un movimiento de stock: descuenta o suma cantidades
  // al producto y lo agrega al historial.
  async function registrarMovimiento(evento) {
    evento.preventDefault();
    setErrorMov("");
    setExitoMov("");

    const { tipo, productoId, cantidad, bodegaOrigenId, bodegaDestinoId } = formularioMov;

    if (!productoId) {
      setErrorMov("Selecciona un producto.");
      return;
    }
    if (!cantidad || Number(cantidad) <= 0) {
      setErrorMov("La cantidad debe ser mayor a cero.");
      return;
    }
    if ((tipo === "salida" || tipo === "traslado") && !bodegaOrigenId) {
      setErrorMov("Selecciona la bodega de origen.");
      return;
    }
    if ((tipo === "entrada" || tipo === "traslado") && !bodegaDestinoId) {
      setErrorMov("Selecciona la bodega de destino.");
      return;
    }

    setGuardandoMov(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));

      const producto = productos.find((p) => String(p.id) === String(productoId));

      // Actualiza el stock localmente (simulado).
      setProductos((actual) =>
        actual.map((p) => {
          if (String(p.id) !== String(productoId)) return p;
          if (tipo === "entrada") return { ...p, stock: p.stock + Number(cantidad) };
          if (tipo === "salida") return { ...p, stock: p.stock - Number(cantidad) };
          return p;
        })
      );

      const bodegaOrigen = bodegas.find((b) => String(b.id) === String(bodegaOrigenId));
      const bodegaDestino = bodegas.find((b) => String(b.id) === String(bodegaDestinoId));
      const numeroCotizacion = generarNumeroCotizacion();

      const nuevoMovimiento = {
        id: siguienteIdMovimiento++,
        numeroCotizacion,
        fecha: new Date().toISOString(),
        tipo,
        motivo: formularioMov.motivo,
        productoCodigo: producto?.codigo || "",
        productoDescripcion: producto?.descripcion || "",
        bodegaOrigen: bodegaOrigen?.nombre || "",
        bodegaDestino: bodegaDestino?.nombre || "",
        cantidad: Number(cantidad),
        usuario: "Usuario demo",
        observaciones: formularioMov.observaciones,
      };

      setHistorial((actual) => [nuevoMovimiento, ...actual]);
      setExitoMov(`Movimiento registrado correctamente. N° de cotización: ${numeroCotizacion}`);
      setFormularioMov({ ...FORM_MOV_VACIO, tipo });
    } catch (err) {
      setErrorMov("No se pudo registrar el movimiento. Intenta de nuevo.");
    } finally {
      setGuardandoMov(false);
    }
  }

  // ---------- Historial ----------
  const [cargandoHistorial] = useState(false);
  const [errorHistorial] = useState("");
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);

  // Actualiza un filtro del historial (producto, bodega o fechas).
  function actualizarFiltro(campo, valor) {
    setFiltros((actual) => ({ ...actual, [campo]: valor }));
  }

  // Borra todos los filtros del historial y vuelve a mostrarlo completo.
  function limpiarFiltros() {
    setFiltros(FILTROS_VACIOS);
  }

  // Por ahora no hace nada porque el filtro ya se aplica en memoria;
  // queda lista para cuando se consulte al backend con los filtros.
  function cargarHistorial() {
    // Los filtros ya se aplican en memoria sobre "historial"; este método
    // queda como gancho para cuando se consulte al backend con los filtros.
  }

  // Aplica los filtros (código, bodega, fechas) sobre la lista de movimientos.
  const historialFiltrado = useMemo(() => {
    return historial.filter((m) => {
      if (
        filtros.codigoProducto &&
        !m.productoCodigo.toLowerCase().includes(filtros.codigoProducto.toLowerCase())
      ) {
        return false;
      }
      if (filtros.bodegaId) {
        const nombreBodega = bodegas.find((b) => String(b.id) === String(filtros.bodegaId))?.nombre;
        if (m.bodegaOrigen !== nombreBodega && m.bodegaDestino !== nombreBodega) return false;
      }
      if (filtros.fechaDesde && new Date(m.fecha) < new Date(filtros.fechaDesde)) return false;
      if (filtros.fechaHasta && new Date(m.fecha) > new Date(filtros.fechaHasta + "T23:59:59")) {
        return false;
      }
      return true;
    });
  }, [historial, filtros, bodegas]);

  return {
    // Productos
    productos,
    cargandoProductos,
    errorProductos,
    guardandoProducto,
    formularioProducto,
    editandoProductoId,
    mostrarFormularioProducto,
    actualizarCampoProducto,
    abrirFormularioNuevoProducto,
    abrirFormularioEdicionProducto,
    cerrarFormularioProducto,
    guardarProducto,
    eliminarProducto,
    busquedaProducto,
    setBusquedaProducto,
    productosFiltrados,

    // Movimientos
    bodegas,
    cargandoOpcionesMov,
    formularioMov,
    errorMov,
    exitoMov,
    guardandoMov,
    actualizarCampoMov,
    cambiarTipoMov,
    registrarMovimiento,
    MOTIVOS_ENTRADA,
    MOTIVOS_SALIDA,

    // Historial
    historial: historialFiltrado,
    cargandoHistorial,
    errorHistorial,
    filtros,
    actualizarFiltro,
    limpiarFiltros,
    cargarHistorial,
  };
}