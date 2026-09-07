// @ts-nocheck -- contrato de controlador pendiente de centralizar.
import Paginacion from "./Paginacion";
import { formatearFechaColombia } from "../Utils/fechas";

// Pestaña "Historial" de Inventario: filtros + tabla de movimientos +
// paginación. Extraído de InventarioPage.tsx sin cambiar props ni
// comportamiento -- solo recibe lo que ya usaba de useControladorInventario.
function PanelHistorialInventario({
  sesion,
  filtros,
  actualizarFiltro,
  limpiarFiltros,
  cargarHistorial,
  errorHistorial,
  cargandoHistorial,
  historial,
  bodegas,
  paginacionHistorial,
  setPaginaHistorial,
}) {
  return (
    <div>
      <h1 className="inventario-titulo" style={{ marginBottom: "1.5rem" }}>
        Historial de movimientos — {sesion?.bodegaNombre || "mi bodega"}
      </h1>

      <div className="inventario-form inventario-filtros">
        <div className="inventario-form-grid">
          <div>
            <label>Código de producto</label>
            <input
              value={filtros.codigoProducto}
              onChange={(e) => actualizarFiltro("codigoProducto", e.target.value)}
              placeholder="Ej: PRD-001"
            />
          </div>

          <div>
            <label>N° Cotización</label>
            <input
              value={filtros.cotizacion}
              onChange={(e) => actualizarFiltro("cotizacion", e.target.value)}
              placeholder="Ej: COT-00125"
            />
          </div>

          <div>
            <label>Desde</label>
            <input
              type="date"
              value={filtros.fechaDesde}
              onChange={(e) => actualizarFiltro("fechaDesde", e.target.value)}
            />
          </div>

          <div>
            <label>Hasta</label>
            <input
              type="date"
              value={filtros.fechaHasta}
              onChange={(e) => actualizarFiltro("fechaHasta", e.target.value)}
            />
          </div>
        </div>

        <div className="inventario-form-botones">
          <button className="inventario-boton" onClick={cargarHistorial}>
            Filtrar
          </button>
          <button className="inventario-boton-cancelar" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        </div>
      </div>

      {errorHistorial && <p className="inventario-error">{errorHistorial}</p>}

      {cargandoHistorial ? (
        <p className="inventario-cargando">Cargando historial...</p>
      ) : (
        <>
        <div className="inventario-tabla-contenedor">
          <table className="inventario-tabla">
            <thead>
              <tr>
                <th>N° Cotización</th>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Motivo</th>
                <th>Producto</th>
                <th>Referencia</th>
                <th>Origen</th>
                <th>Destino</th>
                <th>Cantidad</th>
                <th>Usuario</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {historial.length === 0 ? (
                <tr>
                  <td colSpan={11} className="inventario-vacio">
                    No hay movimientos que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                historial.map((m) => (
                  <tr key={m.id}>
                    <td>{m.cotizacion || "—"}</td>
                    <td>{formatearFechaColombia(m.fecha)}</td>
                    <td style={{ textTransform: "capitalize" }}>{m.tipo}</td>
                    <td style={{ textTransform: "capitalize" }}>
                      {(m.motivo || "—").replace("_", " ")}
                    </td>
                    <td>
                      {m.productoCodigo} — {m.productoDescripcion}
                    </td>
                    <td>{m.identificadorRollo || "—"}</td>
                    <td>{bodegas.find((b) => b.id === m.bodegaOrigenId)?.nombre || "—"}</td>
                    <td>{bodegas.find((b) => b.id === m.bodegaDestinoId)?.nombre || "—"}</td>
                    <td>{m.cantidad}</td>
                    <td>{m.usuario}</td>
                    <td>{m.observaciones || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Paginacion
          paginacion={paginacionHistorial}
          alCambiarPagina={setPaginaHistorial}
          etiqueta="movimientos"
        />
        </>
      )}
    </div>
  );
}

export default PanelHistorialInventario;
