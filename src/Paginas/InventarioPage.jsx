import { useState } from "react";
import BarraLateral from "../Componentes/BarraLateral.jsx";
import { useControladorInventario } from "../Componentes/Inventario.jsx";
import Paginacion from "../Componentes/Paginacion.jsx";
import "../Style/Inventario.css";

function InventarioPage({ sesion, onCerrarSesion, almacen }) {
  const [pestanaActiva, setPestanaActiva] = useState("productos"); // "productos" | "movimientos" | "historial"

  const {
    // Productos
    productos,
    cargandoProductos,
    errorProductos,
    guardandoProducto,
    formularioProducto,
    editandoProductoId,
    mostrarFormularioProducto,
    actualizarCampoProducto,
    abrirFormularioNuevoProducto,
    abrirFormularioEdicionProducto,
    cerrarFormularioProducto,
    guardarProducto,
    eliminarProducto,
    busquedaProducto,
    cambiarBusquedaProducto,
    productosFiltrados,
    setPaginaProductos,
    paginacionProductos,

    // Movimientos
    bodegas,
    bodegaActual,
    cargandoOpcionesMov,
    formularioMov,
    errorMov,
    exitoMov,
    guardandoMov,
    actualizarCampoMov,
    cambiarTipoMov,
    registrarMovimiento,
    MOTIVOS_ENTRADA,
    MOTIVOS_SALIDA,

    // Historial
    historial,
    cargandoHistorial,
    errorHistorial,
    filtros,
    actualizarFiltro,
    limpiarFiltros,
    cargarHistorial,
    setPaginaHistorial,
    paginacionHistorial,
  } = useControladorInventario(sesion, almacen);

  return (
    <div className="layout-con-sidebar">
      <BarraLateral sesion={sesion} onCerrarSesion={onCerrarSesion} />

      <div className="layout-contenido">
        <div className="inventario-page">
          <div className="inventario-pestanas">
        <button
          className={`inventario-pestana-boton ${
            pestanaActiva === "productos" ? "inventario-pestana-activa" : ""
          }`}
          onClick={() => setPestanaActiva("productos")}
        >
          Productos
        </button>
        <button
          className={`inventario-pestana-boton ${
            pestanaActiva === "movimientos" ? "inventario-pestana-activa" : ""
          }`}
          onClick={() => setPestanaActiva("movimientos")}
        >
          Movimientos
        </button>
        <button
          className={`inventario-pestana-boton ${
            pestanaActiva === "historial" ? "inventario-pestana-activa" : ""
          }`}
          onClick={() => setPestanaActiva("historial")}
        >
          Historial
        </button>
      </div>

      {/* ================== PESTAÑA: PRODUCTOS ================== */}
      {pestanaActiva === "productos" && (
        <div>
          <div className="inventario-header">
            <h1 className="inventario-titulo">Productos</h1>
            {!mostrarFormularioProducto && (
              <button className="inventario-boton" onClick={abrirFormularioNuevoProducto}>
                + Agregar producto
              </button>
            )}
          </div>

          {!mostrarFormularioProducto && (
            <div className="inventario-buscador">
              <input
                type="text"
                placeholder="Buscar por código, código de importación o descripción..."
                value={busquedaProducto}
                onChange={(e) => cambiarBusquedaProducto(e.target.value)}
              />
            </div>
          )}

          {mostrarFormularioProducto && (
            <form className="inventario-form" onSubmit={guardarProducto} noValidate>
              <h2 className="inventario-form-subtitulo">
                {editandoProductoId ? "Editar producto" : "Nuevo producto"}
              </h2>

              <div className="inventario-form-grid">
                <div>
                  <label>Código de importación</label>
                  <input
                    value={formularioProducto.codigoImportacion}
                    onChange={(e) => actualizarCampoProducto("codigoImportacion", e.target.value)}
                  />
                </div>
                <div>
                  <label>Código</label>
                  <input
                    value={formularioProducto.codigo}
                    onChange={(e) => actualizarCampoProducto("codigo", e.target.value)}
                  />
                </div>
                <div>
                  <label>Descripción</label>
                  <input
                    value={formularioProducto.descripcion}
                    onChange={(e) => actualizarCampoProducto("descripcion", e.target.value)}
                  />
                </div>
                <div>
                  <label>Calibre</label>
                  <input
                    value={formularioProducto.calibre}
                    onChange={(e) => actualizarCampoProducto("calibre", e.target.value)}
                  />
                </div>
                <div>
                  <label>Entrada</label>
                  <input
                    type="number"
                    value={formularioProducto.entrada}
                    onChange={(e) => actualizarCampoProducto("entrada", e.target.value)}
                  />
                </div>
                <div>
                  <label>Stock</label>
                  <input
                    type="number"
                    value={formularioProducto.stock}
                    onChange={(e) => actualizarCampoProducto("stock", e.target.value)}
                  />
                </div>
              </div>

              {errorProductos && <p className="inventario-error">{errorProductos}</p>}

              <div className="inventario-form-botones">
                <button type="submit" className="inventario-boton" disabled={guardandoProducto}>
                  {guardandoProducto
                    ? "Guardando..."
                    : editandoProductoId
                    ? "Guardar cambios"
                    : "Agregar producto"}
                </button>
                <button
                  type="button"
                  className="inventario-boton-cancelar"
                  onClick={cerrarFormularioProducto}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {!mostrarFormularioProducto && (
            cargandoProductos ? (
              <p className="inventario-cargando">Cargando productos...</p>
            ) : (
              <>
              <div className="inventario-tabla-contenedor">
                <table className="inventario-tabla">
                  <thead>
                    <tr>
                      <th>Código de importación</th>
                      <th>Código</th>
                      <th>Descripción</th>
                      <th>Calibre</th>
                      <th>Entrada</th>
                      <th>Stock</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="inventario-vacio">
                          {busquedaProducto
                            ? "No se encontraron productos que coincidan con la búsqueda."
                            : "No hay productos registrados."}
                        </td>
                      </tr>
                    ) : (
                      productosFiltrados.map((p) => (
                        <tr key={p.id}>
                          <td>{p.codigoImportacion}</td>
                          <td>{p.codigo}</td>
                          <td>{p.descripcion}</td>
                          <td>{p.calibre}</td>
                          <td>{p.entrada}</td>
                          <td>{p.stock}</td>
                          <td className="inventario-acciones">
                            <button onClick={() => abrirFormularioEdicionProducto(p)}>Editar</button>
                            <button
                              className="inventario-boton-eliminar"
                              onClick={() => eliminarProducto(p.id)}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Paginacion
                paginacion={paginacionProductos}
                alCambiarPagina={setPaginaProductos}
                etiqueta="productos"
              />
              </>
            )
          )}
        </div>
      )}

      {/* ================== PESTAÑA: MOVIMIENTOS ================== */}
      {pestanaActiva === "movimientos" && (
        <div>
          <h1 className="inventario-titulo" style={{ marginBottom: "1.5rem" }}>
            Registrar movimiento
          </h1>

          {cargandoOpcionesMov ? (
            <p className="inventario-cargando">Cargando datos...</p>
          ) : (
            <form className="inventario-form" onSubmit={registrarMovimiento} noValidate>
              <div className="inventario-tipos">
                {["entrada", "salida", "traslado"].map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    className={`inventario-tipo-boton ${
                      formularioMov.tipo === tipo ? "inventario-tipo-activo" : ""
                    }`}
                    onClick={() => cambiarTipoMov(tipo)}
                  >
                    {tipo === "entrada" && "Entrada"}
                    {tipo === "salida" && "Salida"}
                    {tipo === "traslado" && "Traslado"}
                  </button>
                ))}
              </div>

              <div className="inventario-form-grid">
                {(formularioMov.tipo === "entrada" || formularioMov.tipo === "salida") && (
                  <div>
                    <label>Motivo</label>
                    <select
                      value={formularioMov.motivo}
                      onChange={(e) => actualizarCampoMov("motivo", e.target.value)}
                    >
                      <option value="">Selecciona un motivo</option>
                      {(formularioMov.tipo === "entrada" ? MOTIVOS_ENTRADA : MOTIVOS_SALIDA).map(
                        (m) => (
                          <option key={m.valor} value={m.valor}>
                            {m.etiqueta}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                )}

                <div>
                  <label>Producto</label>
                  <select
                    value={formularioMov.productoId}
                    onChange={(e) => actualizarCampoMov("productoId", e.target.value)}
                  >
                    <option value="">Selecciona un producto</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} — {p.descripcion}
                      </option>
                    ))}
                  </select>
                </div>

                {(formularioMov.tipo === "salida" || formularioMov.tipo === "traslado") && (
                  <div>
                    <label>Bodega de origen</label>
                    <input value={bodegaActual?.nombre || ""} disabled readOnly />
                  </div>
                )}

                {(formularioMov.tipo === "entrada" || formularioMov.tipo === "traslado") && (
                  <div>
                    <label>Bodega de destino</label>
                    <select
                      value={formularioMov.bodegaDestinoId}
                      onChange={(e) => actualizarCampoMov("bodegaDestinoId", e.target.value)}
                    >
                      <option value="">Selecciona una bodega</option>
                      {bodegas.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label>Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={formularioMov.cantidad}
                    onChange={(e) => actualizarCampoMov("cantidad", e.target.value)}
                  />
                </div>

                <div className="inventario-observaciones">
                  <label>Observaciones</label>
                  <textarea
                    rows={3}
                    value={formularioMov.observaciones}
                    onChange={(e) => actualizarCampoMov("observaciones", e.target.value)}
                  />
                </div>
              </div>

              {errorMov && <p className="inventario-error">{errorMov}</p>}
              {exitoMov && <p className="inventario-exito">{exitoMov}</p>}

              <button type="submit" className="inventario-boton" disabled={guardandoMov}>
                {guardandoMov ? "Registrando..." : "Registrar movimiento"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ================== PESTAÑA: HISTORIAL ================== */}
      {pestanaActiva === "historial" && (
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
                      <td colSpan={10} className="inventario-vacio">
                        No hay movimientos que coincidan con los filtros.
                      </td>
                    </tr>
                  ) : (
                    historial.map((m) => (
                      <tr key={m.id}>
                        <td>{m.cotizacion || "—"}</td>
                        <td>{new Date(m.fecha).toLocaleString("es-CO")}</td>
                        <td style={{ textTransform: "capitalize" }}>{m.tipo}</td>
                        <td style={{ textTransform: "capitalize" }}>
                          {(m.motivo || "—").replace("_", " ")}
                        </td>
                        <td>
                          {m.productoCodigo} — {m.productoDescripcion}
                        </td>
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
      )}
        </div>
      </div>
    </div>
  );
}

export default InventarioPage;
