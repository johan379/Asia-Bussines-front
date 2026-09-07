// @ts-nocheck -- contrato de controlador pendiente de centralizar.

// Sección "4. Resumen" de Producción. Extraído de ProduccionPage.tsx sin
// cambiar props ni comportamiento -- no usa estado local propio, todo viene
// del controlador (useControladorProduccion) vía props.
function PanelResumenProduccion({
  rollosSeleccionados,
  totalMetrosAConsumir,
  observaciones,
  setObservaciones,
}) {
  return (
    <section className="produccion-tarjeta">
      <h2>4. Resumen</h2>
      <p className="produccion-resumen">
        <strong>{rollosSeleccionados.length}</strong> rollo
        {rollosSeleccionados.length === 1 ? "" : "s"} seleccionado
        {rollosSeleccionados.length === 1 ? "" : "s"} — total a consumir:{" "}
        <strong>{totalMetrosAConsumir} m</strong>
      </p>

      <label className="produccion-label">Observaciones (opcional)</label>
      <textarea
        rows={2}
        className="produccion-input"
        value={observaciones}
        onChange={(e) => setObservaciones(e.target.value)}
        placeholder="Ej: orden de producción #1234"
      />
    </section>
  );
}

export default PanelResumenProduccion;
