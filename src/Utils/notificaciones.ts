import type { Envio, Sesion, Solicitud } from "../types/dominio";

/** Notificaciones de la campanita en la barra lateral: solicitudes de otras
 * bodegas pendientes de responder + envíos por confirmar. */
export function contarNotificaciones(
  almacen: { solicitudes?: Solicitud[]; envios?: Envio[] } | null | undefined,
  sesion: Sesion | null | undefined
): number {
  return (
    (almacen?.solicitudes || []).filter(
      (s) => s.bodegaPropietariaId === sesion?.bodegaId && s.estado === "pendiente"
    ).length + (almacen?.envios || []).length
  );
}
