import { useMemo, useState } from "react";
import { api, ErrorApi } from "../Componentes/Api";

export const MOTIVOS_ENTRADA = [
  { valor: "compra_proveedor", etiqueta: "Compra a proveedor" },
  { valor: "devolucion", etiqueta: "Devolución" },
  { valor: "ajuste_inventario", etiqueta: "Ajuste de inventario" },
];
export const MOTIVOS_SALIDA = [
  { valor: "venta", etiqueta: "Venta" },
  { valor: "produccion", etiqueta: "Uso en producción" },
  { valor: "merma", etiqueta: "Merma o daño" },
];
const FORMULARIO_VACIO = { tipo: "entrada", motivo: "", productoId: "", bodegaDestinoId: "", cantidad: "", observaciones: "" };

/** Reglas de validación y persistencia de entradas, salidas y traslados. */
export function useMovimientosInventario({ sesion, almacen, cargarProductos, cargarHistorial }) {
  const bodegaId = sesion?.bodegaId;
  const bodegas = useMemo(() => almacen?.bodegas || [], [almacen?.bodegas]);
  const [formularioMov, setFormularioMov] = useState(FORMULARIO_VACIO);
  const [errorMov, setErrorMov] = useState("");
  const [exitoMov, setExitoMov] = useState("");
  const [guardandoMov, setGuardandoMov] = useState(false);
  const bodegaActual = useMemo(() => bodegas.find((bodega) => bodega.id === bodegaId) || null, [bodegas, bodegaId]);
  const bodegasDestinoDisponibles = useMemo(() => bodegas.filter((bodega) => bodega.id !== bodegaId), [bodegas, bodegaId]);

  function actualizarCampoMov(campo, valor) { setFormularioMov((actual) => ({ ...actual, [campo]: valor })); }
  function cambiarTipoMov(tipo) {
    setFormularioMov({ ...FORMULARIO_VACIO, tipo });
    setErrorMov("");
    setExitoMov("");
  }
  async function registrarMovimiento(evento) {
    evento.preventDefault();
    setErrorMov(""); setExitoMov("");
    const { tipo, productoId, cantidad, bodegaDestinoId } = formularioMov;
    const cantidadNum = Number(cantidad);
    if (!productoId) return setErrorMov("Selecciona un producto.");
    if (!cantidad || cantidadNum <= 0) return setErrorMov("La cantidad debe ser mayor a cero.");
    if (tipo === "traslado" && !bodegaDestinoId) return setErrorMov("Selecciona a qué bodega se traslada el material.");
    setGuardandoMov(true);
    try {
      const movimiento = await api.post("/inventario/movimientos", {
        tipo, motivo: formularioMov.motivo, producto_id: Number(productoId),
        bodega_origen_id: tipo === "salida" || tipo === "traslado" ? bodegaId : null,
        bodega_destino_id: tipo === "traslado" ? Number(bodegaDestinoId) : null,
        cantidad: cantidadNum, observaciones: formularioMov.observaciones,
      });
      await Promise.all([cargarProductos(), cargarHistorial()]);
      setExitoMov(`Movimiento registrado correctamente. N° de cotización: ${movimiento.cotizacion || ""}`);
      setFormularioMov({ ...FORMULARIO_VACIO, tipo });
    } catch (err) {
      setErrorMov(err instanceof ErrorApi ? err.message : "No se pudo registrar el movimiento. Intenta de nuevo.");
    } finally { setGuardandoMov(false); }
  }
  return { bodegas, bodegaId, bodegaActual, bodegasDestinoDisponibles, cargandoOpcionesMov: false,
    formularioMov, errorMov, exitoMov, guardandoMov, actualizarCampoMov, cambiarTipoMov, registrarMovimiento,
    MOTIVOS_ENTRADA, MOTIVOS_SALIDA };
}
