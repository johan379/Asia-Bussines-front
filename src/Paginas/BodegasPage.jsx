import BarraLateral from "../Componentes/BarraLateral.jsx";
import { useControladorBodegas } from "../Componentes/Bodegas.jsx";
import "../Style/Bodegas.css";

const ETIQUETAS_ESTADO_SOLICITUD = {
  pendiente: "Pendiente",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
};

function BodegasPage({ sesion, onCerrarSesion, almacen }) {
  const b = useControladorBodegas(sesion, almacen);

  const notificaciones = (almacen?.solicitudes || []).filter(
    (s) => s.bodegaPropietariaId === sesion?.bodegaId && s.estado === "pendiente"
  ).length;

  return (
    <div className="layout-con-sidebar">
      <BarraLateral sesion={sesion} onCerrarSesion={onCerrarSesion} notificaciones={notificaciones} />

      <div className="layout-contenido">
        <div className="bodegas-page">
          <h1 className="bodegas-titulo">Bodegas</h1>
          <p className="bodegas-subtitulo">
            Consulta la disponibilidad de material en otras bodegas y solicítalo cuando lo
            necesites. La bodega dueña recibe una notificación y, si acepta, el stock se
            descuenta de ella y se suma automáticamente a {sesion?.bodegaNombre}.
          </p>

          {/* ================== NOTIFICACIONES ================== */}
          {b.solicitudesPendientesParaMi.length > 0 && (
            <section className="bodegas-tarjeta bodegas-notificaciones">
              <h2>
                Solicitudes pendientes
                <span className="bodegas-contador">{b.solicitudesPendientesParaMi.length}</span>
              </h2>
              {b.errorRespuesta && <p className="bodegas-error">{b.errorRespuesta}</p>}
              <ul className="bodegas-lista-notificaciones">
                {b.solicitudesPendientesParaMi.map((s) => (
                  <li key={s.id} className="bodegas-notificacion">
                    <div>
                      <strong>{s.bodegaSolicitanteNombre}</strong> solicitó{" "}
                      <strong>{s.cantidad}</strong> de <strong>{s.productoCodigo}</strong> —{" "}
                      {s.productoDescripcion}
                      <span className="bodegas-tag-tipo">{s.tipoOperacion}</span>
                      {s.observaciones && (
                        <p className="bodegas-nota-solicitud">"{s.observaciones}"</p>
                      )}
                    </div>
                    <div className="bodegas-acciones-notificacion">
                      <button
                        className="bodegas-boton-aceptar"
                        disabled={b.procesandoSolicitudId === s.id}
                        onClick={() => b.aceptarSolicitud(s.id)}
                      >
                        {b.procesandoSolicitudId === s.id ? "Procesando..." : "Aceptar"}
                      </button>
                      <button
                        className="bodegas-boton-rechazar"
                        disabled={b.procesandoSolicitudId === s.id}
                        onClick={() => b.rechazarSolicitud(s.id)}
                      >
                        Rechazar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ================== BUSCAR MATERIAL EN OTRA BODEGA ================== */}
          <section className="bodegas-tarjeta">
            <h2>Buscar material en otra bodega</h2>

            <div className="bodegas-buscador-bodega">
              <input
                type="text"
                placeholder="Buscar bodega por nombre..."
                value={b.busquedaBodegaInput}
                onChange={(e) => b.setBusquedaBodegaInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && b.aplicarFiltroBodega()}
              />
              <button className="bodegas-boton-filtrar" onClick={b.aplicarFiltroBodega}>
                Filtrar
              </button>
            </div>

            {b.bodegasFiltradas.length === 0 ? (
              <p className="bodegas-vacio">No se encontró ninguna bodega con ese nombre.</p>
            ) : (
              <div className="bodegas-lista-nombres">
                {b.bodegasFiltradas.map((bodega) => (
                  <button
                    key={bodega.id}
                    className={`bodegas-chip-bodega ${
                      b.bodegaSeleccionadaId === bodega.id ? "bodegas-chip-activo" : ""
                    }`}
                    onClick={() => b.seleccionarBodega(bodega.id)}
                  >
                    {bodega.nombre}
                  </button>
                ))}
              </div>
            )}

            {b.bodegaSeleccionada && (
              <div className="bodegas-inventario-seleccionado">
                <div className="bodegas-inventario-header">
                  <h3>Inventario de {b.bodegaSeleccionada.nombre}</h3>
                  <button className="bodegas-boton-secundario" onClick={b.limpiarSeleccionBodega}>
                    Cerrar
                  </button>
                </div>

                <input
                  type="text"
                  className="bodegas-input-producto"
                  placeholder="Buscar producto por nombre o código..."
                  value={b.busquedaProductoBodega}
                  onChange={(e) => b.setBusquedaProductoBodega(e.target.value)}
                />

                {b.inventarioBodegaSeleccionada.length === 0 ? (
                  <p className="bodegas-vacio">
                    {b.busquedaProductoBodega
                      ? "Ningún producto coincide con esa búsqueda en esta bodega."
                      : "Esta bodega todavía no tiene productos registrados."}
                  </p>
                ) : (
                  <table className="bodegas-tabla">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Rollo</th>
                        <th>Descripción</th>
                        <th>Stock disponible</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.inventarioBodegaSeleccionada.map((p) => (
                        <tr key={p.id}>
                          <td>{p.codigo}</td>
                          <td>{p.identificadorRollo || "—"}</td>
                          <td>{p.descripcion}</td>
                          <td>{p.stock}</td>
                          <td>
                            <button
                              className="bodegas-boton-solicitar"
                              disabled={p.stock <= 0}
                              onClick={() => b.abrirFormularioSolicitud(p)}
                            >
                              {p.rolloId ? "Solicitar este rollo" : "Solicitar / Intercambio"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {b.exitoSolicitud && <p className="bodegas-exito">{b.exitoSolicitud}</p>}
          </section>

          {/* ================== MODAL: SOLICITAR MATERIAL ================== */}
          {b.productoSeleccionado && (
            <div className="bodegas-modal-fondo" onClick={b.cerrarFormularioSolicitud}>
              <div className="bodegas-modal" onClick={(e) => e.stopPropagation()}>
                <h3>
                  Solicitar {b.productoSeleccionado.codigo}
                  {b.productoSeleccionado.identificadorRollo
                    ? ` — rollo ${b.productoSeleccionado.identificadorRollo}`
                    : ""}
                  {` — ${b.productoSeleccionado.descripcion}`}
                </h3>
                <p className="bodegas-texto-ayuda">
                  Disponible en {b.productoSeleccionado.bodegaNombre}:{" "}
                  <strong>{b.productoSeleccionado.stock}</strong>
                </p>

                <form onSubmit={b.enviarSolicitud} noValidate>
                  <label>Tipo de operación</label>
                  <select
                    aria-label="Tipo de operación"
                    value={b.formularioSolicitud.tipoOperacion}
                    onChange={(e) => b.actualizarCampoSolicitud("tipoOperacion", e.target.value)}
                  >
                    {b.TIPOS_OPERACION.map((t) => (
                      <option key={t.valor} value={t.valor}>
                        {t.etiqueta}
                      </option>
                    ))}
                  </select>

                  <label>Cantidad</label>
                  <input
                    aria-label="Cantidad"
                    type="number"
                    min="1"
                    max={b.productoSeleccionado.stock}
                    value={b.formularioSolicitud.cantidad}
                    onChange={(e) => b.actualizarCampoSolicitud("cantidad", e.target.value)}
                    readOnly={Boolean(b.productoSeleccionado.rolloId)}
                  />
                  {b.productoSeleccionado.rolloId && (
                    <p className="bodegas-texto-ayuda">
                      Se solicitará este rollo completo; no se mezcla con otros rollos del mismo código.
                    </p>
                  )}

                  <label>Observaciones (opcional)</label>
                  <textarea
                    aria-label="Observaciones opcionales"
                    rows={2}
                    value={b.formularioSolicitud.observaciones}
                    onChange={(e) => b.actualizarCampoSolicitud("observaciones", e.target.value)}
                    placeholder="Ej: lo necesito para un pedido urgente"
                  />

                  {b.errorSolicitud && <p className="bodegas-error">{b.errorSolicitud}</p>}

                  <div className="bodegas-modal-acciones">
                    <button
                      type="button"
                      className="bodegas-boton-secundario"
                      onClick={b.cerrarFormularioSolicitud}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bodegas-boton-primario"
                      disabled={b.enviandoSolicitud}
                    >
                      {b.enviandoSolicitud ? "Enviando..." : "Enviar solicitud"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ================== MIS SOLICITUDES ENVIADAS ================== */}
          {b.misSolicitudesEnviadas.length > 0 && (
            <section className="bodegas-tarjeta">
              <h2>Mis solicitudes enviadas</h2>
              <table className="bodegas-tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Material</th>
                    <th>Cantidad</th>
                    <th>Bodega dueña</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {b.misSolicitudesEnviadas.map((s) => (
                    <tr key={s.id}>
                      <td>{new Date(s.fecha).toLocaleString()}</td>
                      <td>
                        {s.productoCodigo} — {s.productoDescripcion}
                      </td>
                      <td>{s.cantidad}</td>
                      <td>{s.bodegaPropietariaNombre}</td>
                      <td>{s.tipoOperacion}</td>
                      <td>
                        <span className={`bodegas-estado-badge estado-${s.estado}`}>
                          {ETIQUETAS_ESTADO_SOLICITUD[s.estado]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default BodegasPage;
