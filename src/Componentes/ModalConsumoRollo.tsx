// @ts-nocheck -- contrato de controlador pendiente de centralizar.

// Modal "Registrar consumo" de Rollos: descuenta metros de un rollo
// específico. Extraído de RollosPage.tsx sin cambiar props ni
// comportamiento -- no usa estado local propio, todo viene del
// controlador (useControladorRollos) vía props.
function ModalConsumoRollo({
  rolloParaConsumo,
  cantidadConsumo,
  setCantidadConsumo,
  observacionesConsumo,
  setObservacionesConsumo,
  errorConsumo,
  guardandoConsumo,
  cerrarConsumo,
  registrarConsumo,
}) {
  return (
    <div className="rollos-modal-fondo" onClick={cerrarConsumo}>
      <div className="rollos-modal" onClick={(e) => e.stopPropagation()}>
        <h3>
          Consumo — {rolloParaConsumo.codigoInterno} (rollo{" "}
          {rolloParaConsumo.identificadorRollo})
        </h3>
        <p className="rollos-texto-ayuda">
          Disponible en este rollo: <strong>{rolloParaConsumo.metrosDisponibles} m</strong>
        </p>

        <form onSubmit={registrarConsumo} noValidate>
          <label htmlFor="rollos-consumo-metros">Metros a consumir</label>
          <input
            id="rollos-consumo-metros"
            type="number"
            min="1"
            max={rolloParaConsumo.metrosDisponibles}
            value={cantidadConsumo}
            onChange={(e) => setCantidadConsumo(e.target.value)}
          />

          <label htmlFor="rollos-consumo-observaciones">Observaciones (opcional)</label>
          <textarea
            id="rollos-consumo-observaciones"
            rows={2}
            value={observacionesConsumo}
            onChange={(e) => setObservacionesConsumo(e.target.value)}
            placeholder="Ej: orden de producción #1234"
          />

          {errorConsumo && <p className="rollos-error">{errorConsumo}</p>}

          <div className="rollos-modal-acciones">
            <button type="button" className="rollos-boton-secundario" onClick={cerrarConsumo}>
              Cancelar
            </button>
            <button
              type="submit"
              className="rollos-boton-primario"
              disabled={guardandoConsumo}
            >
              {guardandoConsumo ? "Guardando..." : "Registrar consumo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalConsumoRollo;
