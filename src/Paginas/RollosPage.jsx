import { useState } from "react";
import BarraLateral from "../Componentes/BarraLateral.jsx";
import { useControladorRollos } from "../Componentes/Rollos.jsx";
import { claseColorMaterial } from "../Utils/colorRollo.js";
import Paginacion from "../Componentes/Paginacion.jsx";
import "../Style/Rollos.css";

function RollosPage({ sesion, onCerrarSesion, almacen }) {
  const r = useControladorRollos(sesion, almacen);
  const [gruposExpandidos, setGruposExpandidos] = useState({});

  const notificaciones = (almacen?.solicitudes || []).filter(
    (s) => s.bodegaPropietariaId === sesion?.bodegaId && s.estado === "pendiente"
  ).length;

  function alternarGrupo(codigoInterno) {
    setGruposExpandidos((actual) => ({ ...actual, [codigoInterno]: !actual[codigoInterno] }));
  }

  return (
    <div className="layout-con-sidebar">
      <BarraLateral sesion={sesion} onCerrarSesion={onCerrarSesion} notificaciones={notificaciones} />

      <div className="layout-contenido">
        <div className="rollos-page">
          <h1 className="rollos-titulo">Rollos almacenados</h1>
          <p className="rollos-subtitulo">
            Materia prima (rollos de acero) de {sesion?.bodegaNombre}. Aunque varios rollos
            compartan el mismo código interno, cada uno mantiene sus propios metros, estado e
            historial — el sistema nunca los une ni suma sus metros automáticamente.
          </p>

          {/* ================== FILTROS / BÚSQUEDA ================== */}
          <section className="rollos-tarjeta">
            <h2>Buscar rollos</h2>
            <div className="rollos-filtros-grid">
              <div>
                <label htmlFor="rollos-f-codigo-interno">Código interno</label>
                <input
                  id="rollos-f-codigo-interno"
                  type="text"
                  value={r.filtros.codigoInterno}
                  onChange={(e) => r.actualizarFiltro("codigoInterno", e.target.value)}
                  placeholder="Ej. LA50170,27"
                />
              </div>
              <div>
                <label htmlFor="rollos-f-codigo-proveedor">Código del proveedor</label>
                <input
                  id="rollos-f-codigo-proveedor"
                  type="text"
                  value={r.filtros.codigoProveedor}
                  onChange={(e) => r.actualizarFiltro("codigoProveedor", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="rollos-f-descripcion">Descripción</label>
                <input
                  id="rollos-f-descripcion"
                  type="text"
                  value={r.filtros.descripcion}
                  onChange={(e) => r.actualizarFiltro("descripcion", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="rollos-f-familia">Familia</label>
                <select
                  id="rollos-f-familia"
                  value={r.filtros.familia}
                  onChange={(e) => r.actualizarFiltro("familia", e.target.value)}
                >
                  <option value="">Todas</option>
                  {r.familiasDisponibles.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="rollos-f-color">Color del material</label>
                <select
                  id="rollos-f-color"
                  value={r.filtros.colorMaterial}
                  onChange={(e) => r.actualizarFiltro("colorMaterial", e.target.value)}
                >
                  <option value="">Todos</option>
                  {r.coloresDisponibles.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="rollos-f-calibre">Calibre</label>
                <input
                  id="rollos-f-calibre"
                  type="text"
                  value={r.filtros.calibre}
                  onChange={(e) => r.actualizarFiltro("calibre", e.target.value)}
                  placeholder="Ej. 0.27"
                />
              </div>
              <div>
                <label htmlFor="rollos-f-estado">Estado</label>
                <select
                  id="rollos-f-estado"
                  value={r.filtros.estado}
                  onChange={(e) => r.actualizarFiltro("estado", e.target.value)}
                >
                  <option value="">Todos</option>
                  {Object.entries(r.ESTADOS_ROLLO).map(([valor, etiqueta]) => (
                    <option key={valor} value={valor}>
                      {etiqueta}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="rollos-f-fecha-desde">Ingreso desde</label>
                <input
                  id="rollos-f-fecha-desde"
                  type="date"
                  value={r.filtros.fechaDesde}
                  onChange={(e) => r.actualizarFiltro("fechaDesde", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="rollos-f-fecha-hasta">Ingreso hasta</label>
                <input
                  id="rollos-f-fecha-hasta"
                  type="date"
                  value={r.filtros.fechaHasta}
                  onChange={(e) => r.actualizarFiltro("fechaHasta", e.target.value)}
                />
              </div>
            </div>
            <button className="rollos-boton-secundario" onClick={r.limpiarFiltros}>
              Limpiar filtros
            </button>
          </section>

          <Paginacion
            paginacion={r.paginacion}
            alCambiarPagina={r.setPagina}
            etiqueta="rollos"
          />

          {/* ================== AGRUPACIÓN VISUAL POR CÓDIGO ================== */}
          {r.gruposPorCodigo.length === 0 ? (
            <section className="rollos-tarjeta">
              <p className="rollos-vacio">No hay rollos que coincidan con la búsqueda.</p>
            </section>
          ) : (
            r.gruposPorCodigo.map((grupo) => {
              const expandido = !!gruposExpandidos[grupo.codigoInterno];
              const colorClase = claseColorMaterial(grupo.colorMaterial);
              return (
                <section key={grupo.codigoInterno} className={`rollos-tarjeta rollos-grupo rollos-color-${colorClase}`}>
                  <button
                    className="rollos-grupo-header"
                    onClick={() => alternarGrupo(grupo.codigoInterno)}
                  >
                    <div className="rollos-grupo-info">
                      <span className="rollos-grupo-codigo">{grupo.codigoInterno}</span>
                      <span className="rollos-grupo-detalle">
                        <span className={`rollos-color-etiqueta color-${colorClase}`}>
                          <span className="rollos-color-muestra" aria-hidden="true" />
                          {grupo.colorMaterial || "Sin color"}
                        </span>
                        <span>Calibre {grupo.calibre}</span>
                      </span>
                    </div>
                    <div className="rollos-grupo-cantidad">
                      <span className="numero">{grupo.rollos.length}</span>
                      <span>rollo{grupo.rollos.length === 1 ? "" : "s"}</span>
                    </div>
                    <span className="rollos-grupo-flecha">{expandido ? "▲" : "▼"}</span>
                  </button>

                  {expandido && (
                    <table className="rollos-tabla">
                      <thead>
                        <tr>
                          <th>Identificador</th>
                          <th>Proveedor</th>
                          <th>Peso neto (t)</th>
                          <th>Metros proveedor</th>
                          <th>Metros calculados</th>
                          <th>Disponibles</th>
                          <th>Consumidos</th>
                          <th>Ingreso</th>
                          <th>Estado</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.rollos.map((rollo) => (
                          <tr key={rollo.id}>
                            <td>{rollo.identificadorRollo}</td>
                            <td>{rollo.proveedor || "—"}</td>
                            <td>{rollo.pesoNeto ?? "—"}</td>
                            <td>{rollo.metrosProveedor ?? "—"}</td>
                            <td>{rollo.metrosCalculados ?? "—"}</td>
                            <td>{rollo.metrosDisponibles}</td>
                            <td>{rollo.metrosConsumidos}</td>
                            <td>{new Date(rollo.fechaIngreso).toLocaleDateString()}</td>
                            <td>
                              <span className={`rollos-estado-badge estado-${rollo.estado}`}>
                                {r.ESTADOS_ROLLO[rollo.estado]}
                              </span>
                            </td>
                            <td>
                              <button
                                className="rollos-boton-consumo"
                                disabled={rollo.estado === "agotado"}
                                onClick={() => r.abrirConsumo(rollo)}
                              >
                                Registrar consumo
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>
              );
            })
          )}

          {/* ================== MODAL: REGISTRAR CONSUMO ================== */}
          {r.rolloParaConsumo && (
            <div className="rollos-modal-fondo" onClick={r.cerrarConsumo}>
              <div className="rollos-modal" onClick={(e) => e.stopPropagation()}>
                <h3>
                  Consumo — {r.rolloParaConsumo.codigoInterno} (rollo{" "}
                  {r.rolloParaConsumo.identificadorRollo})
                </h3>
                <p className="rollos-texto-ayuda">
                  Disponible en este rollo: <strong>{r.rolloParaConsumo.metrosDisponibles} m</strong>
                </p>

                <form onSubmit={r.registrarConsumo} noValidate>
                  <label htmlFor="rollos-consumo-metros">Metros a consumir</label>
                  <input
                    id="rollos-consumo-metros"
                    type="number"
                    min="1"
                    max={r.rolloParaConsumo.metrosDisponibles}
                    value={r.cantidadConsumo}
                    onChange={(e) => r.setCantidadConsumo(e.target.value)}
                  />

                  <label htmlFor="rollos-consumo-observaciones">Observaciones (opcional)</label>
                  <textarea
                    id="rollos-consumo-observaciones"
                    rows={2}
                    value={r.observacionesConsumo}
                    onChange={(e) => r.setObservacionesConsumo(e.target.value)}
                    placeholder="Ej: orden de producción #1234"
                  />

                  {r.errorConsumo && <p className="rollos-error">{r.errorConsumo}</p>}

                  <div className="rollos-modal-acciones">
                    <button type="button" className="rollos-boton-secundario" onClick={r.cerrarConsumo}>
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="rollos-boton-primario"
                      disabled={r.guardandoConsumo}
                    >
                      {r.guardandoConsumo ? "Guardando..." : "Registrar consumo"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RollosPage;
