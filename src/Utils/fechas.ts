/** Convierte fechas UTC (incluidas las DATETIME antiguas de MySQL) a hora Colombia. */
function comoFechaUtc(valor: string | Date): Date {
  if (valor instanceof Date) return valor;
  // Las fechas antiguas de MySQL no incluyen zona, pero se guardaron en UTC.
  const tieneZona = /(?:Z|[+-]\d{2}:\d{2})$/i.test(valor);
  return new Date(tieneZona ? valor : `${valor}Z`);
}

export function formatearFechaColombia(valor: string | Date, incluirHora = true): string {
  const fecha = comoFechaUtc(valor);
  if (Number.isNaN(fecha.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    ...(incluirHora ? { timeStyle: "short" } : {}),
    timeZone: "America/Bogota",
  }).format(fecha);
}
