import BarraLateral from "../Componentes/BarraLateral.jsx";
import { useControladorReportes } from "../Componentes/Reportes.jsx";
import Paginacion from "../Componentes/Paginacion.jsx";
import { exportarArregloAExcel } from "../Utils/exportarExcel.js";
import "../Style/Reportes.css";

const ETIQUETAS_TIPO = {
  entrada: "Entrada",
  salida: "Salida",
  traslado: "Traslado",
  transferencia: "Transferencia",
};

function ReportesPage({ sesion, onCerrarSesion, almacen }) {
  const r = useControladorReportes(sesion, almacen);

  const notificaciones = (almacen?.solicitudes || []).filter(
    (s) => s.bodegaPropietariaId === sesion?.bodegaId && s.estado === "pendiente"
  ).length;

  return (
    <div className="layout-con-sidebar">
      <BarraLateral sesion={sesion} onCerrarSesion={onCerrarSesion} notificaciones={notificaciones} />

      <div className="layout-contenido">
        <div className="reportes-page">
          <h1 className="reportes-titulo">Reportes</h1>
          <p className="reportes-subtitulo">
            Todas las entradas, salidas y movimientos de {sesion?.bodegaNombre}, junto con las
            alertas de stock.
          </p>

          {/* ================== ALERTAS DE STOCK ================== */}
          {r.productosAgotados.length > 0 && (
            <section className="reportes-tarjeta reportes-alerta reportes-alerta-agotado">
              <h2>🔴 Productos agotados ({r.productosAgotados.length})</h2>
              <ul className="reportes-lista-alerta">
                {r.productosAgotados.map((p) => (
                  <li key={p.id}>
                    <strong>{p.codigo}</strong> — {p.descripcion} (stock: {p.stock})
                  </li>
                ))}
              </ul>
            </section>
          )}

          {r.productosStockBajo.length > 0 && (
            <section className="reportes-tarjeta reportes-alerta reportes-alerta-bajo">
              <h2>🟡 Stock bajo ({r.productosStockBajo.length})</h2>
              <ul className="reportes-lista-alerta">
                {r.productosStockBajo.map((p) => (
                  <li key={p.id}>
                    <strong>{p.codigo}</strong> — {p.descripcion} (stock: {p.stock})
                  </li>
                ))}
              </ul>
            </section>
          )}

          {r.productosAgotados.length === 0 && r.productosStockBajo.length === 0 && !r.cargandoProductos && (
            <section className="reportes-tarjeta reportes-alerta reportes-alerta-ok">
              <h2>✓ Sin alertas de stock</h2>
              <p className="reportes-texto-ayuda">Todos los productos tienen existencias suficientes.</p>
            </section>
          )}

          {/* ================== RESUMEN ================== */}
          <section className="reportes-resumen-grid">
            <div className="reportes-resumen-card">
              <span className="reportes-resumen-numero">{r.resumen.entradas}</span>
              <span className="reportes-resumen-etiqueta">Entradas</span>
            </div>
            <div className="reportes-resumen-card">
              <span className="reportes-resumen-numero">{r.resumen.salidas}</span>
              <span className="reportes-resumen-etiqueta">Salidas</span>
            </div>
            <div className="reportes-resumen-card">
              <span className="reportes-resumen-numero">{r.resumen.traslados}</span>
              <span className="reportes-resumen-etiqueta">Traslados</span>
            </div>
            <div className="reportes-resumen-card">
              <span className="reportes-resumen-numero">{r.resumen.transferencias}</span>
              <span className="reportes-resumen-etiqueta">Transferencias</span>
            </div>
          </section>

          {/* ================== FILTROS ================== */}
          <section className="reportes-tarjeta">
            <h2>Filtrar movimientos</h2>
            <div className="reportes-filtros-grid">
              <div>
                <label>Tipo</label>
                <select value={r.filtros.tipo} onChange={(e) => r.actualizarFiltro("tipo", e.target.value)}>
                  <option value="">Todos</option>
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                  <option value="traslado">Traslado</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </div>
              <div>
                <label>Código de producto</label>
                <input
                  type="text"
                  value={r.filtros.codigoProducto}
                  onChange={(e) => r.actualizarFiltro("codigoProducto", e.target.value)}
                  placeholder="Ej. TEL-001"
                />
              </div>
              <div>
                <label>Desde</label>
                <input
                  type="date"
                  value={r.filtros.fechaDesde}
                  onChange={(e) => r.actualizarFiltro("fechaDesde", e.target.value)}
                />
              </div>
              <div>
                <label>Hasta</label>
                <input
                  type="date"
                  value={r.filtros.fechaHasta}
                  onChange={(e) => r.actualizarFiltro("fechaHasta", e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
              <button className="reportes-boton-secundario" onClick={r.limpiarFiltros}>
                Limpiar filtros
              </button>
              <button
                className="reportes-boton-secundario"
                onClick={() => exportarArregloAExcel(r.movimientos, "Historial_Movimientos.xlsx", "Movimientos")}
              >
                📥 Exportar a Excel
              </button>
            </div>
          </section>

          {/* ================== TABLA DE MOVIMIENTOS ================== */}
          <section className="reportes-tarjeta">
            <h2>Movimientos</h2>
            {r.cargandoMovimientos ? (
              <p className="reportes-vacio">Cargando...</p>
            ) : r.errorMovimientos ? (
              <p className="reportes-error">{r.errorMovimientos}</p>
            ) : r.movimientos.length === 0 ? (
              <p className="reportes-vacio">No hay movimientos que coincidan con la búsqueda.</p>
            ) : (
              <>
              <div className="reportes-tabla-wrap">
                <table className="reportes-tabla">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Motivo</th>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Usuario</th>
                      <th>Observaciones</th>
                      <th>Cotización</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.movimientos.map((m) => (
                      <tr key={m.id}>
                        <td>{new Date(m.fecha).toLocaleString()}</td>
                        <td>
                          <span className={`reportes-tipo-badge tipo-${m.tipo}`}>
                            {ETIQUETAS_TIPO[m.tipo] || m.tipo}
                          </span>
                        </td>
                        <td>{m.motivo || "—"}</td>
                        <td>
                          {m.productoCodigo} — {m.productoDescripcion}
                        </td>
                        <td>{m.cantidad}</td>
                        <td>{m.usuario}</td>
                        <td>{m.observaciones || "—"}</td>
                        <td>{m.cotizacion || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Paginacion
                paginacion={r.paginacion}
                alCambiarPagina={r.setPagina}
                etiqueta="movimientos"
              />
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default ReportesPage;
