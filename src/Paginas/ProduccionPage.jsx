import BarraLateral from "../Componentes/BarraLateral.jsx";
import { useControladorProduccion } from "../Componentes/Produccion.jsx";
import "../Style/Produccion.css";

const ETIQUETAS_ESTADO = {
  cerrado: "Cerrado",
  abierto: "Abierto",
  agotado: "Acabado",
};

function ProduccionPage({ sesion, onCerrarSesion, almacen }) {
  const p = useControladorProduccion(sesion, almacen);

  const notificaciones = (almacen?.solicitudes || []).filter(
    (s) => s.bodegaPropietariaId === sesion?.bodegaId && s.estado === "pendiente"
  ).length;

  return (
    <div className="layout-con-sidebar">
      <BarraLateral sesion={sesion} onCerrarSesion={onCerrarSesion} notificaciones={notificaciones} />

      <div className="layout-contenido">
        <div className="produccion-page">
          <h1 className="produccion-titulo">
            {p.puedeRegistrarProduccion ? "Registrar Producción" : "Hoja de Vida"}
          </h1>
          <p className="produccion-subtitulo">
            {p.puedeRegistrarProduccion
              ? "Consume uno o varios rollos para un proceso de producción. Cada rollo descuenta sus propios metros — nunca se resta de un total agrupado."
              : "Reporte de control de material: consulta las producciones registradas en tu bodega."}
          </p>

          {p.puedeRegistrarProduccion && (
            <>
          {p.produccionConfirmada ? (
            <section className="produccion-tarjeta produccion-confirmacion">
              <h2>✓ Producción {p.produccionConfirmada.codigoUnico} registrada</h2>
              <p>
                Se consumieron <strong>{p.produccionConfirmada.totalMetrosConsumidos} m</strong> de{" "}
                {p.produccionConfirmada.rollosUtilizados.length} rollo
                {p.produccionConfirmada.rollosUtilizados.length === 1 ? "" : "s"} del código{" "}
                <strong>{p.produccionConfirmada.codigoClasificacion}</strong>, obteniendo{" "}
                <strong>
                  {p.produccionConfirmada.cantidadProductos} {p.produccionConfirmada.modelo}
                </strong>{" "}
                ({p.produccionConfirmada.medidaProducto}).
              </p>
              <p>
                Saldo restante en el/los rollo{p.produccionConfirmada.rollosUtilizados.length === 1 ? "" : "s"} que
                usaste:{" "}
                <strong>{p.produccionConfirmada.saldoCodigo} m</strong>. Responsable:{" "}
                <strong>{p.produccionConfirmada.responsable}</strong>.
              </p>
              <ul className="produccion-detalle-lista">
                {p.produccionConfirmada.rollosUtilizados.map((r) => (
                  <li key={r.rolloId}>
                    Rollo {r.identificadorRollo}: {r.metrosConsumidos} m
                  </li>
                ))}
              </ul>
              <button className="produccion-boton-primario" onClick={p.iniciarNuevoRegistro}>
                Registrar otra producción
              </button>
            </section>
          ) : (
            <>
              <section className="produccion-tarjeta">
                <h2>1. Datos del producto fabricado</h2>
                <div className="produccion-form-grid">
                  <div>
                    <label className="produccion-label" htmlFor="prod-producto">Producto (opcional)</label>
                    <input
                      id="prod-producto"
                      type="text"
                      className="produccion-input"
                      placeholder="Ej. Cubierta metálica"
                      value={p.productoFabricado}
                      onChange={(e) => p.setProductoFabricado(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="produccion-label" htmlFor="prod-modelo">Modelo</label>
                    <input
                      id="prod-modelo"
                      type="text"
                      className="produccion-input"
                      placeholder="Ej. M-200"
                      value={p.modelo}
                      onChange={(e) => p.setModelo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="produccion-label" htmlFor="prod-medida">Medida del producto</label>
                    <input
                      id="prod-medida"
                      type="text"
                      className="produccion-input"
                      placeholder="Ej. 3m x 1m"
                      value={p.medidaProducto}
                      onChange={(e) => p.setMedidaProducto(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="produccion-label" htmlFor="prod-cantidad">Cantidad de productos obtenidos</label>
                    <input
                      id="prod-cantidad"
                      type="number"
                      min="1"
                      className="produccion-input"
                      placeholder="Ej. 50"
                      value={p.cantidadProductos}
                      onChange={(e) => p.setCantidadProductos(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="produccion-label" htmlFor="prod-responsable">Responsable</label>
                    <input
                      id="prod-responsable"
                      type="text"
                      className="produccion-input"
                      placeholder="Nombre de quien produce"
                      value={p.responsable}
                      onChange={(e) => p.setResponsable(e.target.value)}
                    />
                  </div>
                </div>
              </section>

              <section className="produccion-tarjeta">
                <h2>2. Buscar código de clasificación</h2>
                <input
                  type="text"
                  className="produccion-input"
                  placeholder="Ej. LA50030,25"
                  value={p.codigoBusqueda}
                  onChange={(e) => p.setCodigoBusqueda(e.target.value)}
                />

                {p.codigoBusqueda.trim() && (
                  <>
                    {p.rollosDisponibles.length === 0 ? (
                      <p className="produccion-vacio">
                        No hay rollos registrados con ese código en tu bodega.
                      </p>
                    ) : (
                      <div className="produccion-tabla-wrap">
                        <table className="produccion-tabla produccion-tabla-resultados">
                          <thead>
                            <tr>
                              <th></th>
                              <th>Rollo</th>
                              <th>Color</th>
                              <th>Calibre</th>
                              <th>Disponibles</th>
                              <th>Estado</th>
                              <th>Metros a consumir</th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.rollosDisponibles.map((rollo) => {
                              const seleccionado = !!p.seleccion[rollo.id]?.seleccionado;
                              const esAgotado = rollo.estado === "agotado";
                              return (
                                <tr key={rollo.id} className={esAgotado ? "fila-agotada" : ""}>
                                  <td>
                                    <input
                                      type="checkbox"
                                      checked={seleccionado}
                                      disabled={esAgotado}
                                      onChange={() => p.alternarSeleccionRollo(rollo)}
                                    />
                                  </td>
                                  <td>{rollo.identificadorRollo}</td>
                                  <td>{rollo.colorMaterial}</td>
                                  <td>{rollo.calibre}</td>
                                  <td>{rollo.metrosDisponibles}</td>
                                  <td>
                                    <span className={`produccion-estado-badge estado-${rollo.estado}`}>
                                      {ETIQUETAS_ESTADO[rollo.estado]}
                                    </span>
                                  </td>
                                  <td>
                                    {seleccionado && (
                                      <input
                                        type="number"
                                        min="1"
                                        max={rollo.metrosDisponibles}
                                        className="produccion-input-metros"
                                        value={p.seleccion[rollo.id]?.metrosTexto ?? ""}
                                        onChange={(e) =>
                                          p.actualizarMetrosRollo(rollo.id, e.target.value)
                                        }
                                      />
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </section>

              {p.rollosSeleccionados.length > 0 && (
                <section className="produccion-tarjeta">
                  <h2>3. Resumen</h2>
                  <p className="produccion-resumen">
                    <strong>{p.rollosSeleccionados.length}</strong> rollo
                    {p.rollosSeleccionados.length === 1 ? "" : "s"} seleccionado
                    {p.rollosSeleccionados.length === 1 ? "" : "s"} — total a consumir:{" "}
                    <strong>{p.totalMetrosAConsumir} m</strong>
                  </p>

                  <label className="produccion-label">Observaciones (opcional)</label>
                  <textarea
                    rows={2}
                    className="produccion-input"
                    value={p.observaciones}
                    onChange={(e) => p.setObservaciones(e.target.value)}
                    placeholder="Ej: orden de producción #1234"
                  />
                </section>
              )}

              {p.errorValidacion && <p className="produccion-error">{p.errorValidacion}</p>}

              <div className="produccion-acciones">
                <button className="produccion-boton-secundario" onClick={p.cancelar}>
                  Cancelar
                </button>
                <button
                  className="produccion-boton-primario"
                  onClick={p.registrarProduccion}
                  disabled={p.guardando}
                >
                  {p.guardando ? "Registrando..." : "Registrar Producción"}
                </button>
              </div>
            </>
          )}

            </>
          )}

          {p.misProducciones.length > 0 ? (
            <section className="produccion-tarjeta produccion-tabla-wrap">
              <h2>Producciones registradas</h2>
              <table className="produccion-tabla produccion-tabla-historial">
                <thead>
                  <tr>
                    <th>Código único</th>
                    <th>Fecha</th>
                    <th>Modelo</th>
                    <th>Cantidad</th>
                    <th>Medida</th>
                    <th>Código clasificación</th>
                    <th>Rollos</th>
                    <th>Metros usados</th>
                    <th>Saldo del rollo</th>
                    <th>Responsable</th>
                    <th>Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {p.misProducciones.map((prod) => (
                    <tr key={prod.id}>
                      <td>{prod.codigoUnico}</td>
                      <td>{new Date(prod.fecha).toLocaleString()}</td>
                      <td>{prod.modelo || "—"}</td>
                      <td>{prod.cantidadProductos}</td>
                      <td>{prod.medidaProducto || "—"}</td>
                      <td>{prod.codigoClasificacion}</td>
                      <td>{prod.rollosUtilizados.length}</td>
                      <td>{prod.totalMetrosConsumidos}</td>
                      <td>{prod.saldoCodigo}</td>
                      <td>{prod.responsable}</td>
                      <td>{prod.observaciones || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : (
            <p className="produccion-vacio">Todavía no hay producciones registradas en tu bodega.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProduccionPage;