import { useCallback, useEffect, useState } from "react";
import { api } from "./Api";

export const FAMILIAS_POR_UNIDAD = [
  "Caballetes",
  "Maquila",
  "Amarres",
  "Capuchones",
  "Tornillos",
  "Fibra de vidrio",
  "Tumbilos",
];

export const FAMILIA_ROLLOS = "Rollos de acero";

// La información compartida debe venir siempre del backend. Mantener bodegas o
// solicitudes de ejemplo aquí provocaba que se enviaran IDs incorrectos.
export function useAlmacenGlobal(sesion) {
  const [bodegas, setBodegas] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);

  const cargarBodegas = useCallback(async () => {
    if (!sesion?.bodegaId) {
      setBodegas([]);
      return;
    }

    const bodegaActual = {
      id: sesion.bodegaId,
      nombre: sesion.bodegaNombre || "Mi bodega",
    };

    try {
      const otrasBodegas = await api.get("/bodegas");
      const sinDuplicados = otrasBodegas.filter((bodega) => bodega.id !== bodegaActual.id);
      setBodegas([bodegaActual, ...sinDuplicados]);
    } catch {
      // La pantalla sigue mostrando la bodega actual si una consulta secundaria falla.
      setBodegas([bodegaActual]);
    }
  }, [sesion?.bodegaId, sesion?.bodegaNombre]);

  const refrescarSolicitudesPendientes = useCallback(async () => {
    if (!sesion?.bodegaId) {
      setSolicitudes([]);
      return;
    }

    try {
      const datos = await api.get("/bodegas/solicitudes/recibidas");
      setSolicitudes(datos.filter((solicitud) => solicitud.estado === "pendiente"));
    } catch {
      setSolicitudes([]);
    }
  }, [sesion?.bodegaId]);

  useEffect(() => {
    cargarBodegas();
    refrescarSolicitudesPendientes();
  }, [cargarBodegas, refrescarSolicitudesPendientes]);

  return {
    bodegas,
    solicitudes,
    cargarBodegas,
    refrescarSolicitudesPendientes,
  };
}
