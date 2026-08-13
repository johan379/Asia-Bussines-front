import { useCallback, useEffect, useRef, useState } from "react";
import { api, ErrorApi } from "../Componentes/Api";
import { productoDesdeApi } from "../Componentes/Mapeo";

const FORMULARIO_VACIO = {
  codigoImportacion: "",
  codigo: "",
  descripcion: "",
  calibre: "",
  entrada: "",
  stock: "",
};

/** Estado y operaciones del catálogo de productos. */
export function useProductosInventario() {
  const ultimaConsulta = useRef(0);
  const [productos, setProductos] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState("");
  const [guardandoProducto, setGuardandoProducto] = useState(false);
  const [formularioProducto, setFormularioProducto] = useState(FORMULARIO_VACIO);
  const [editandoProductoId, setEditandoProductoId] = useState(null);
  const [mostrarFormularioProducto, setMostrarFormularioProducto] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [paginaProductos, setPaginaProductos] = useState(1);
  const [paginacionProductos, setPaginacionProductos] = useState({ total: 0, pagina: 1, total_paginas: 1 });

  const cargarProductos = useCallback(async () => {
    const consultaActual = ++ultimaConsulta.current;
    setCargandoProductos(true);
    setErrorProductos("");
    try {
      const parametros = new URLSearchParams({ paginado: "true", pagina: String(paginaProductos), tamano: "30" });
      if (busquedaProducto.trim()) parametros.set("busqueda", busquedaProducto.trim());
      const datos = await api.get(`/inventario/productos?${parametros.toString()}`);
      if (consultaActual !== ultimaConsulta.current) return;
      setProductos(datos.items.map(productoDesdeApi));
      setPaginacionProductos(datos);
    } catch {
      if (consultaActual !== ultimaConsulta.current) return;
      setErrorProductos("No se pudieron cargar los productos.");
    } finally {
      if (consultaActual === ultimaConsulta.current) setCargandoProductos(false);
    }
  }, [busquedaProducto, paginaProductos]);

  useEffect(() => { cargarProductos(); }, [cargarProductos]);

  function actualizarCampoProducto(campo, valor) {
    setFormularioProducto((actual) => ({ ...actual, [campo]: valor }));
  }

  function cambiarBusquedaProducto(valor) {
    setBusquedaProducto(valor);
    setPaginaProductos(1);
  }

  function abrirFormularioNuevoProducto() {
    setFormularioProducto(FORMULARIO_VACIO);
    setEditandoProductoId(null);
    setErrorProductos("");
    setMostrarFormularioProducto(true);
  }

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

  function cerrarFormularioProducto() {
    setMostrarFormularioProducto(false);
    setEditandoProductoId(null);
    setErrorProductos("");
  }

  async function guardarProducto(evento) {
    evento.preventDefault();
    if (!formularioProducto.codigo.trim() || !formularioProducto.descripcion.trim()) {
      setErrorProductos("Código y descripción son obligatorios.");
      return;
    }
    setGuardandoProducto(true);
    setErrorProductos("");
    try {
      const cuerpo = {
        codigo_importacion: formularioProducto.codigoImportacion || "",
        codigo: formularioProducto.codigo,
        descripcion: formularioProducto.descripcion,
        familia: formularioProducto.familia || "",
        calibre: String(formularioProducto.calibre ?? ""),
        entrada: Number(formularioProducto.entrada) || 0,
        stock: Number(formularioProducto.stock) || 0,
      };
      if (editandoProductoId) await api.put(`/inventario/productos/${editandoProductoId}`, cuerpo);
      else await api.post("/inventario/productos", cuerpo);
      await cargarProductos();
      setMostrarFormularioProducto(false);
      setEditandoProductoId(null);
    } catch (err) {
      setErrorProductos(err instanceof ErrorApi ? err.message : "No se pudo guardar el producto. Intenta de nuevo.");
    } finally {
      setGuardandoProducto(false);
    }
  }

  async function eliminarProducto(id) {
    try {
      await api.delete(`/inventario/productos/${id}`);
      setProductos((actual) => actual.filter((producto) => producto.id !== id));
    } catch {
      setErrorProductos("No se pudo eliminar el producto.");
    }
  }

  return {
    productos, productosFiltrados: productos, cargarProductos, cargandoProductos, errorProductos,
    guardandoProducto, formularioProducto, editandoProductoId, mostrarFormularioProducto,
    actualizarCampoProducto, cambiarBusquedaProducto, abrirFormularioNuevoProducto,
    abrirFormularioEdicionProducto, cerrarFormularioProducto, guardarProducto, eliminarProducto,
    busquedaProducto, setBusquedaProducto, paginaProductos, setPaginaProductos, paginacionProductos,
  };
}
