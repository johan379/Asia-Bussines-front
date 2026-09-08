// @ts-nocheck -- contrato de controlador pendiente de centralizar.

// Modal "Salida externa" de Rollos: saca el rollo COMPLETO hacia otra
// empresa (intercambio, no una transferencia entre nuestras bodegas).
// Mismo esqueleto que ModalConsumoRollo.tsx -- no usa estado local propio,
// todo viene del controlador (useControladorRollos) vía props.
function ModalSalidaExternaRollo({
  rolloParaSalidaExterna,
  empresaSalidaExterna,
  setEmpresaSalidaExterna,
  observacionesSalidaExterna,
  setObservacionesSalidaExterna,
  errorSalidaExterna,
  guardandoSalidaExterna,
  cerrarSalidaExterna,
  registrarSalidaExterna,
}) {
  return (
    <div className="rollos-modal-fondo" onClick={cerrarSalidaExterna}>
      <div className="rollos-modal" onClick={(e) => e.stopPropagation()}>
        <h3>
          Salida externa — {rolloParaSalidaExterna.codigoInterno} (rollo{" "}
          {rolloParaSalidaExterna.identificadorRollo})
        </h3>
        <p className="rollos-texto-ayuda">
          Se registrará la salida completa de{" "}
          <strong>{rolloParaSalidaExterna.metrosDisponibles} m</strong> hacia otra empresa.
          El rollo quedará marcado como agotado.
        </p>

        <form onSubmit={registrarSalidaExterna} noValidate>
          <label htmlFor="rollos-salida-empresa">Empresa</label>
          <input
            id="rollos-salida-empresa"
            type="text"
            required
            value={empresaSalidaExterna}
            onChange={(e) => setEmpresaSalidaExterna(e.target.value)}
            placeholder="Ej: Tejas del Norte S.A."
          />

          <label htmlFor="rollos-salida-observaciones">Observaciones (opcional)</label>
          <textarea
            id="rollos-salida-observaciones"
            rows={2}
            value={observacionesSalidaExterna}
            onChange={(e) => setObservacionesSalidaExterna(e.target.value)}
            placeholder="Ej: intercambio por lote defectuoso"
          />

          {errorSalidaExterna && <p className="rollos-error">{errorSalidaExterna}</p>}

          <div className="rollos-modal-acciones">
            <button type="button" className="rollos-boton-secundario" onClick={cerrarSalidaExterna}>
              Cancelar
            </button>
            <button
              type="submit"
              className="rollos-boton-primario"
              disabled={guardandoSalidaExterna}
            >
              {guardandoSalidaExterna ? "Guardando..." : "Registrar salida"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalSalidaExternaRollo;
