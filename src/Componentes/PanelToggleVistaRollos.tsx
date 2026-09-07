// @ts-nocheck -- contrato de controlador pendiente de centralizar.

// Sección "Activos / Rollos acabados" de Rollos (toggle de vista).
// Extraído de RollosPage.tsx sin cambiar props ni comportamiento -- no usa
// estado local propio, todo viene del controlador (useControladorRollos)
// vía props.
function PanelToggleVistaRollos({ vista, cambiarVista }) {
  return (
    <section className="rollos-tarjeta">
      <div className="rollos-vista-toggle" role="tablist" aria-label="Vista de rollos">
        <button
          type="button"
          role="tab"
          aria-selected={vista === "activos"}
          className={vista === "activos" ? "rollos-boton-primario" : "rollos-boton-secundario"}
          onClick={() => cambiarVista("activos")}
        >
          Activos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={vista === "acabados"}
          className={vista === "acabados" ? "rollos-boton-primario" : "rollos-boton-secundario"}
          onClick={() => cambiarVista("acabados")}
        >
          Rollos acabados
        </button>
      </div>
      {vista === "acabados" && (
        <p className="rollos-subtitulo" style={{ marginTop: "0.5rem" }}>
          Rollos sin metros disponibles. Se conservan permanentemente para trazabilidad, pero
          no aparecen en el inventario activo.
        </p>
      )}
    </section>
  );
}

export default PanelToggleVistaRollos;
