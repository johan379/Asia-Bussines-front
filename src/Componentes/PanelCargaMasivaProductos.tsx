// @ts-nocheck -- contrato de controlador pendiente de centralizar.
import { ETIQUETAS_CAMPOS_CARGA_PRODUCTOS, TODOS_LOS_CAMPOS_CARGA_PRODUCTOS } from "../Utils/cargaProductos";

// Pestaña "Carga masiva" de Inventario: subir Excel -> mapear columnas ->
// confirmar -> resultado. Extraído de InventarioPage.tsx sin cambiar props
// ni comportamiento -- solo recibe lo que ya usaba de useControladorInventario.
function PanelCargaMasivaProductos({
  pasoCarga,
  procesandoArchivoCarga,
  cargarArchivoProductos,
  errorArchivoCarga,
  nombreArchivoCarga,
  hojasDisponiblesCarga,
  hojaActualCarga,
  cambiandoHojaCarga,
  cambiarHojaCargaProductos,
  mapeoColumnasCarga,
  actualizarMapeoColumnaProductos,
  encabezadosCarga,
  faltanCamposRequeridosCarga,
  errorConfirmacionCarga,
  reiniciarCargaProductos,
  confirmarCargaProductos,
  confirmandoCarga,
  resultadoCarga,
  setPestanaActiva,
}) {
  return (
    <div>
      <h1 className="inventario-titulo" style={{ marginBottom: "1.5rem" }}>
        Carga masiva de productos
      </h1>
      <p className="inventario-carga-ayuda">
        Sube el Excel de inventario de la empresa (tornillos y demás productos por stock —
        los rollos de acero se cargan desde "Recepción y Verificación"). El sistema detecta
        las columnas automáticamente; ajusta las que no correspondan antes de confirmar.
      </p>

      {pasoCarga === "carga" && (
        <div className="inventario-form">
          <label className="inventario-boton" style={{ display: "inline-flex", cursor: "pointer" }}>
            {procesandoArchivoCarga ? "Procesando..." : "Seleccionar archivo Excel"}
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={cargarArchivoProductos}
              disabled={procesandoArchivoCarga}
              hidden
            />
          </label>
          {errorArchivoCarga && <p className="inventario-error">{errorArchivoCarga}</p>}
        </div>
      )}

      {pasoCarga === "mapeo" && (
        <div className="inventario-form">
          <h2 className="inventario-form-subtitulo">
            Verifica las columnas de "{nombreArchivoCarga}"
          </h2>

          {hojasDisponiblesCarga.length > 1 && (
            <div className="inventario-mapeo-campo" style={{ maxWidth: 320, marginBottom: "1rem" }}>
              <label>Hoja del Excel</label>
              <select
                value={hojaActualCarga}
                disabled={cambiandoHojaCarga}
                onChange={(e) => cambiarHojaCargaProductos(e.target.value)}
              >
                {hojasDisponiblesCarga.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="inventario-mapeo-grid">
            {TODOS_LOS_CAMPOS_CARGA_PRODUCTOS.map((campo) => (
              <div key={campo} className="inventario-mapeo-campo">
                <label>{ETIQUETAS_CAMPOS_CARGA_PRODUCTOS[campo]}</label>
                <select
                  value={mapeoColumnasCarga[campo] || ""}
                  onChange={(e) => actualizarMapeoColumnaProductos(campo, e.target.value)}
                >
                  <option value="">— No aplica —</option>
                  {encabezadosCarga.map((enc) => (
                    <option key={enc} value={enc}>
                      {enc}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {faltanCamposRequeridosCarga && (
            <p className="inventario-error">
              Asigna una columna a código, descripción y cantidad/stock antes de confirmar.
            </p>
          )}
          {errorConfirmacionCarga && <p className="inventario-error">{errorConfirmacionCarga}</p>}

          <div className="inventario-form-botones">
            <button className="inventario-boton-cancelar" onClick={reiniciarCargaProductos}>
              Cancelar
            </button>
            <button
              className="inventario-boton"
              onClick={confirmarCargaProductos}
              disabled={faltanCamposRequeridosCarga || confirmandoCarga}
            >
              {confirmandoCarga ? "Confirmando..." : "Confirmar carga"}
            </button>
          </div>
        </div>
      )}

      {pasoCarga === "resultado" && resultadoCarga && (
        <div className="inventario-form">
          <h2 className="inventario-form-subtitulo">Resultado de la carga</h2>

          <div className="inventario-carga-resumen">
            <div>
              <span className="numero">{resultadoCarga.filas_totales}</span>
              <span>Filas leídas</span>
            </div>
            <div>
              <span className="numero">{resultadoCarga.creados}</span>
              <span>Creados</span>
            </div>
            <div>
              <span className="numero">{resultadoCarga.actualizados}</span>
              <span>Actualizados</span>
            </div>
            <div>
              <span className="numero">{resultadoCarga.omitidas}</span>
              <span>Omitidas</span>
            </div>
          </div>

          {resultadoCarga.detalle_omitidas.length > 0 && (
            <>
              <h2 className="inventario-form-subtitulo">Filas omitidas</h2>
              <div className="inventario-tabla-contenedor">
                <table className="inventario-tabla">
                  <thead>
                    <tr>
                      <th>Fila</th>
                      <th>Código</th>
                      <th>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultadoCarga.detalle_omitidas.map((o, indice) => (
                      <tr key={indice}>
                        <td>{o.fila}</td>
                        <td>{o.codigo || "—"}</td>
                        <td>{o.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="inventario-form-botones">
            <button className="inventario-boton" onClick={reiniciarCargaProductos}>
              Cargar otro archivo
            </button>
            <button
              className="inventario-boton-cancelar"
              onClick={() => setPestanaActiva("productos")}
            >
              Ir a Productos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PanelCargaMasivaProductos;
