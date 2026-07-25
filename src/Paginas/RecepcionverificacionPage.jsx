import { useState } from "react";
import BarraLateral from "../Componentes/BarraLateral.jsx";
import { useControladorRecepcion } from "../Componentes/RecepcionVerificacion.jsx";
import "../Style/RecepcionVerificacion.css";

const ETIQUETAS_RESULTADO = {
  correcto: "Correcto",
  faltante: "Falta material",
  adicional: "Material adicional",
  faltan_datos: "Faltan datos",
};

// Estos son los ÚNICOS 4 estados que realmente devuelve el controlador
// (useControladorRecepcion -> estadoRecepcion). Antes había etiquetas para
// estados que el hook nunca produce.
const ETIQUETAS_ESTADO = {
  pendiente_verificacion: "Pendiente de verificación",
  verificada_sin_diferencias: "Verificada sin diferencias",
  verificada_con_diferencias: "Verificada con diferencias",
  registrada_en_inventario: "Registrada en inventario",
};

// Pantalla del módulo de Recepción: dibuja los 3 pasos (cargar, mapear,
// verificar/clasificar/confirmar) usando la lógica de useControladorRecepcion.
function RecepcionVerificacionPage({ sesion, onCerrarSesion }) {
  const c = useControladorRecepcion(sesion);

  // Estado puramente visual: mostrar/ocultar el panel de administración de
  // tablas de equivalencias (puntos 5 y 6 del requerimiento). No necesita
  // vivir en el controlador porque no afecta ningún cálculo.
  const [mostrarAdmin, setMostrarAdmin] = useState(false);

  // ---- Detección de equivalencias faltantes (para guiar a la encargada) ----
  // El controlador ya marca esMaterialNuevo (tipo/color sin equivalencia) y
  // pesoPorMetro === null (espesor sin equivalencia). Aquí solo agrupamos esa
  // información para mostrar avisos accionables en vez de un simple "Nuevo".
  const tiposFaltantes = [
    ...new Set(
      c.rollos.filter((r) => r.esMaterialNuevo && r.tipoMaterial).map((r) => r.tipoMaterial)
    ),
  ].filter(
    (tipo) => !c.tablaTipos.some((t) => t.nombre.trim().toLowerCase() === tipo.trim().toLowerCase())
  );

  const coloresFaltantes = [
    ...new Set(
      c.rollos.filter((r) => r.esMaterialNuevo && r.colorTop).map((r) => r.colorTop)
    ),
  ].filter(
    (ral) =>
      !c.tablaColores.some(
        (col) => col.ral.replace(/\s+/g, "").toUpperCase() === ral.replace(/\s+/g, "").toUpperCase()
      )
  );

  const espesoresFaltantes = [
    ...new Set(
      c.rollos.filter((r) => r.pesoPorMetro === null && r.espesor !== null).map((r) => r.espesor)
    ),
  ];

  const hayEquivalenciasFaltantes =
    tiposFaltantes.length > 0 || coloresFaltantes.length > 0 || espesoresFaltantes.length > 0;

  return (
    <div className="layout-con-sidebar">
      <BarraLateral sesion={sesion} onCerrarSesion={onCerrarSesion} />

      <div className="layout-contenido">
        <div className="recepcion-page">
          <main className="recepcion-contenido">
            <h2 className="recepcion-titulo">Recepción y Verificación de material</h2>
            <p className="recepcion-subtitulo">
              Carga el Excel del proveedor y el sistema calculará automáticamente los
              metros de cada rollo, clasificará el material con la nomenclatura interna,
              los comparará con lo reportado y te mostrará las diferencias antes de
              afectar el inventario.
            </p>

            <div className="recepcion-pasos">
              <span className={`recepcion-paso ${c.paso === "carga" ? "activo" : ""}`}>
                1. Cargar archivo
              </span>
              <span className={`recepcion-paso ${c.paso === "mapeo" ? "activo" : ""}`}>
                2. Verificar columnas
              </span>
              <span className={`recepcion-paso ${c.paso === "verificacion" ? "activo" : ""}`}>
                3. Verificación, clasificación y confirmación
              </span>
            </div>

            {c.paso === "carga" && (
              <section className="recepcion-tarjeta">
                <h3>Cargar archivo del proveedor</h3>
                <p className="recepcion-texto-ayuda">
                  Formatos aceptados: .xlsx, .xls. La bodega de destino será{" "}
                  <strong>{sesion?.bodegaNombre}</strong> (la de tu sesión), no es necesario
                  seleccionarla.
                </p>
                <label className="recepcion-boton-cargar">
                  {c.procesandoArchivo ? "Procesando..." : "Seleccionar archivo Excel"}
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={c.cargarArchivo}
                    disabled={c.procesandoArchivo}
                    hidden
                  />
                </label>
                {c.errorArchivo && <p className="recepcion-error">{c.errorArchivo}</p>}
              </section>
            )}

            {c.paso === "mapeo" && (
              <section className="recepcion-tarjeta">
                <h3>Verifica las columnas detectadas</h3>
                <p className="recepcion-texto-ayuda">
                  Archivo: <strong>{c.nombreArchivo}</strong>. El sistema intentó identificar
                  automáticamente cada columna; ajusta las que no correspondan.
                </p>
                {c.notaImportacionEquivalencias && (
                  <p className="recepcion-texto-ayuda recepcion-nota-importacion">
                    ✓ {c.notaImportacionEquivalencias}
                  </p>
                )}

                <div className="recepcion-mapeo-grid">
                  {c.TODOS_LOS_CAMPOS.map((campo) => (
                    <div key={campo} className="recepcion-mapeo-campo">
                      <label>
                        {c.ETIQUETAS_CAMPOS[campo]}
                        {c.CAMPOS_REQUERIDOS.includes(campo) && (
                          <span className="recepcion-req">*</span>
                        )}
                      </label>
                      <select
                        value={c.mapeoColumnas[campo] || ""}
                        onChange={(e) => c.actualizarMapeoColumna(campo, e.target.value)}
                      >
                        <option value="">— No aplica —</option>
                        {c.encabezados.map((enc) => (
                          <option key={enc} value={enc}>
                            {enc}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {c.faltanCamposRequeridos && (
                  <p className="recepcion-error">
                    Debes asignar una columna a todos los campos obligatorios (*).
                  </p>
                )}

                <div className="recepcion-acciones">
                  <button className="recepcion-boton-secundario" onClick={c.iniciarNuevaRecepcion}>
                    Cancelar
                  </button>
                  <button
                    className="recepcion-boton-primario"
                    onClick={c.confirmarMapeo}
                    disabled={c.faltanCamposRequeridos}
                  >
                    Calcular y verificar
                  </button>
                </div>
              </section>
            )}

            {c.paso === "verificacion" && (
              <>
                <section className="recepcion-tarjeta">
                  <div className="recepcion-resumen-header">
                    <h3>Resultado de la verificación</h3>
                    <span className={`recepcion-estado-badge estado-${c.estadoRecepcion}`}>
                      {ETIQUETAS_ESTADO[c.estadoRecepcion]}
                    </span>
                  </div>

                  <div className="recepcion-tolerancia">
                    <label>Margen de tolerancia (%)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={c.toleranciaPorcentaje}
                      onChange={(e) => c.actualizarTolerancia(e.target.value)}
                    />
                  </div>

                  <div className="recepcion-resumen-grid">
                    <div className="recepcion-resumen-item">
                      <span className="numero">{c.resumenVerificacion.total}</span>
                      <span>Rollos</span>
                    </div>
                    <div className="recepcion-resumen-item ok">
                      <span className="numero">{c.resumenVerificacion.correctos}</span>
                      <span>Correctos</span>
                    </div>
                    <div className="recepcion-resumen-item warn">
                      <span className="numero">{c.resumenVerificacion.faltantes}</span>
                      <span>Faltantes</span>
                    </div>
                    <div className="recepcion-resumen-item info">
                      <span className="numero">{c.resumenVerificacion.adicionales}</span>
                      <span>Adicionales</span>
                    </div>
                    <div className="recepcion-resumen-item danger">
                      <span className="numero">{c.resumenVerificacion.pendientesDatos}</span>
                      <span>Faltan datos</span>
                    </div>
                    <div className="recepcion-resumen-item">
                      <span className="numero">{c.resumenVerificacion.materialesNuevos}</span>
                      <span>Sin clasificar</span>
                    </div>
                  </div>
                </section>

                {hayEquivalenciasFaltantes && (
                  <section className="recepcion-tarjeta recepcion-aviso-equivalencias">
                    <h4>Hay equivalencias que aún no están configuradas</h4>
                    <p className="recepcion-texto-ayuda">
                      Estos rollos no se pudieron clasificar o calcular porque falta agregar
                      su equivalencia. Agrégalas en el panel de administración (más abajo) y
                      el sistema recalculará todo automáticamente.
                    </p>
                    <ul className="recepcion-lista-faltantes">
                      {tiposFaltantes.map((tipo) => (
                        <li key={`tipo-${tipo}`}>
                          Tipo de material sin código interno: <strong>{tipo}</strong>
                        </li>
                      ))}
                      {coloresFaltantes.map((ral) => (
                        <li key={`color-${ral}`}>
                          Color sin equivalencia: <strong>{ral}</strong>
                        </li>
                      ))}
                      {espesoresFaltantes.map((esp) => (
                        <li key={`espesor-${esp}`}>
                          Espesor sin tabla de metros por tonelada: <strong>{esp}</strong>
                        </li>
                      ))}
                    </ul>
                    <button
                      className="recepcion-boton-secundario"
                      onClick={() => setMostrarAdmin(true)}
                    >
                      Ir a administrar tablas de equivalencias
                    </button>
                  </section>
                )}

                <section className="recepcion-tarjeta recepcion-tabla-wrap">
                  <div className="recepcion-busqueda">
                    <label>Buscar por código de clasificación o rollo</label>
                    <input
                      type="text"
                      placeholder="Ej. LA50170,25 o 6010905CX"
                      value={c.busquedaClasificacion}
                      onChange={(e) => c.setBusquedaClasificacion(e.target.value)}
                    />
                  </div>

                  <table className="recepcion-tabla">
                    <thead>
                      <tr>
                        <th>Rollo (ID único)</th>
                        <th>Código interno</th>
                        <th>Tipo / Color</th>
                        <th>Espesor</th>
                        <th>Net Weight (Ton)</th>
                        <th>Reportado (m)</th>
                        <th>Calculado (m)</th>
                        <th>Diferencia</th>
                        <th>Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.rollos.map((r) => (
                        <tr key={r.id} className={r.esMaterialNuevo ? "fila-nueva" : ""}>
                          <td>{r.rollo}</td>
                          <td>
                            {r.clasificado ? (
                              r.codigoClasificacion
                            ) : (
                              <span className="recepcion-tag-nuevo">Sin clasificar</span>
                            )}
                          </td>
                          <td>
                            {r.tipoMaterial || "—"}
                            <br />
                            <span className="recepcion-texto-secundario">
                              {r.colorTop || "—"}
                              {r.colorBack ? ` / ${r.colorBack}` : ""}
                            </span>
                          </td>
                          <td>{r.espesor ?? "—"}</td>
                          <td>{r.netWeight ?? "—"}</td>
                          <td>{r.coilMeters ?? "—"}</td>
                          <td>{r.metrosCalculados ?? "—"}</td>
                          <td>
                            {r.diferencia === null
                              ? "—"
                              : `${r.diferencia > 0 ? "+" : ""}${r.diferencia} m`}
                          </td>
                          <td>
                            <span className={`recepcion-resultado resultado-${r.resultado}`}>
                              {ETIQUETAS_RESULTADO[r.resultado]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {c.rollos.length === 0 && (
                    <p className="recepcion-texto-ayuda">
                      No hay rollos que coincidan con la búsqueda.
                    </p>
                  )}
                </section>

                <section className="recepcion-tarjeta">
                  <button
                    className="recepcion-boton-secundario"
                    onClick={() => setMostrarAdmin((actual) => !actual)}
                  >
                    {mostrarAdmin ? "Ocultar" : "Administrar"} tablas de equivalencias
                  </button>

                  {mostrarAdmin && (
                    <PanelAdminEquivalencias
                      tablaColores={c.tablaColores}
                      tablaTipos={c.tablaTipos}
                      tablaEspesor={c.tablaEspesor}
                      agregarEquivalenciaColor={c.agregarEquivalenciaColor}
                      agregarEquivalenciaTipo={c.agregarEquivalenciaTipo}
                      agregarEquivalenciaEspesor={c.agregarEquivalenciaEspesor}
                    />
                  )}
                </section>

                {c.errorConfirmacion && <p className="recepcion-error">{c.errorConfirmacion}</p>}

                <div className="recepcion-acciones">
                  <button className="recepcion-boton-secundario" onClick={c.volverAMapeo}>
                    ← Ajustar columnas
                  </button>
                  {c.estadoRecepcion === "registrada_en_inventario" ? (
                    <button className="recepcion-boton-primario" onClick={c.iniciarNuevaRecepcion}>
                      Cargar otra recepción
                    </button>
                  ) : (
                    <button
                      className="recepcion-boton-primario"
                      onClick={c.confirmarRecepcion}
                      disabled={!c.puedeConfirmar}
                      title={
                        !c.puedeConfirmar
                          ? "Resuelve los rollos con 'Faltan datos' antes de confirmar"
                          : ""
                      }
                    >
                      {c.confirmando ? "Confirmando..." : "Confirmar recepción"}
                    </button>
                  )}
                </div>

                {c.estadoRecepcion === "registrada_en_inventario" && (
                  <p className="recepcion-exito">
                    Recepción confirmada. El inventario de {sesion?.bodegaNombre} fue actualizado.
                  </p>
                )}
              </>
            )}

            {c.historialRecepciones.length > 0 && (
              <section className="recepcion-tarjeta">
                <h3>Historial de recepciones de esta sesión</h3>
                <table className="recepcion-tabla">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Proveedor</th>
                      <th>Archivo</th>
                      <th>Rollos</th>
                      <th>Con diferencias</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.historialRecepciones.map((rec) => (
                      <tr key={rec.id}>
                        <td>{new Date(rec.fecha).toLocaleString()}</td>
                        <td>{rec.proveedor}</td>
                        <td>{rec.archivoOrigen}</td>
                        <td>{rec.resumen.total}</td>
                        <td>{rec.resumen.faltantes + rec.resumen.adicionales}</td>
                        <td>{ETIQUETAS_ESTADO[rec.estado]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel de administración de las 3 tablas de equivalencias (puntos 5 y 6 del
// requerimiento). Usa directamente las funciones que ya expone el
// controlador: agregarEquivalenciaColor, agregarEquivalenciaTipo y
// agregarEquivalenciaEspesor. Solo el estado de los formularios vive aquí,
// porque es puramente de edición de UI, no de datos de la recepción.
// ---------------------------------------------------------------------------
function PanelAdminEquivalencias({
  tablaColores,
  tablaTipos,
  tablaEspesor,
  agregarEquivalenciaColor,
  agregarEquivalenciaTipo,
  agregarEquivalenciaEspesor,
}) {
  const [formColor, setFormColor] = useState({ ral: "", nombre: "", codigoInterno: "" });
  const [formTipo, setFormTipo] = useState({ nombre: "", codigoInterno: "" });
  const [formEspesor, setFormEspesor] = useState({ espesor: "", mtPorTon: "", pesoPorMetro: "" });

  // El código interno del color es opcional: si se deja vacío, el sistema
  // lo genera solo con la inicial del nombre (regla del documento de
  // clasificación). Por eso aquí solo se exige el RAL y el nombre.
  function enviarColor(e) {
    e.preventDefault();
    if (!formColor.ral || !formColor.nombre) return;
    agregarEquivalenciaColor(formColor.ral, formColor.nombre, formColor.codigoInterno);
    setFormColor({ ral: "", nombre: "", codigoInterno: "" });
  }

  function enviarTipo(e) {
    e.preventDefault();
    if (!formTipo.nombre || !formTipo.codigoInterno) return;
    agregarEquivalenciaTipo(formTipo.nombre, formTipo.codigoInterno);
    setFormTipo({ nombre: "", codigoInterno: "" });
  }

  function enviarEspesor(e) {
    e.preventDefault();
    if (!formEspesor.espesor) return;
    agregarEquivalenciaEspesor(formEspesor.espesor, {
      mtPorTonTexto: formEspesor.mtPorTon,
      pesoPorMetroTexto: formEspesor.pesoPorMetro,
    });
    setFormEspesor({ espesor: "", mtPorTon: "", pesoPorMetro: "" });
  }

  return (
    <div className="recepcion-admin-panel">
      <div className="recepcion-admin-columna">
        <h4>Colores (RAL → código interno)</h4>
        <p className="recepcion-texto-ayuda">
          El código es la inicial del color (Azul→A, Negro→N, Gris→G...). Si dos
          colores empiezan igual, escribe el código a mano para diferenciarlos.
        </p>
        <table className="recepcion-admin-tabla">
          <thead>
            <tr>
              <th>RAL</th>
              <th>Nombre</th>
              <th>Código</th>
            </tr>
          </thead>
          <tbody>
            {tablaColores.map((c) => (
              <tr key={c.ral}>
                <td>{c.ral}</td>
                <td>{c.nombre}</td>
                <td>{c.codigoInterno}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <form className="recepcion-admin-form" onSubmit={enviarColor}>
          <input
            placeholder="RAL (ej. 5017)"
            value={formColor.ral}
            onChange={(e) => setFormColor({ ...formColor, ral: e.target.value })}
          />
          <input
            placeholder="Nombre (ej. Azul)"
            value={formColor.nombre}
            onChange={(e) => setFormColor({ ...formColor, nombre: e.target.value })}
          />
          <input
            placeholder="Código (opcional, ej. A)"
            value={formColor.codigoInterno}
            onChange={(e) => setFormColor({ ...formColor, codigoInterno: e.target.value })}
          />
          <button className="recepcion-boton-secundario" type="submit">
            Agregar / actualizar
          </button>
        </form>
      </div>

      <div className="recepcion-admin-columna">
        <h4>Tipos de material</h4>
        <table className="recepcion-admin-tabla">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Código</th>
            </tr>
          </thead>
          <tbody>
            {tablaTipos.map((t) => (
              <tr key={t.nombre}>
                <td>{t.nombre}</td>
                <td>{t.codigoInterno}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <form className="recepcion-admin-form" onSubmit={enviarTipo}>
          <input
            placeholder="Tipo (ej. Lamina)"
            value={formTipo.nombre}
            onChange={(e) => setFormTipo({ ...formTipo, nombre: e.target.value })}
          />
          <input
            placeholder="Código (ej. L)"
            value={formTipo.codigoInterno}
            onChange={(e) => setFormTipo({ ...formTipo, codigoInterno: e.target.value })}
          />
          <button className="recepcion-boton-secundario" type="submit">
            Agregar / actualizar
          </button>
        </form>
      </div>

      <div className="recepcion-admin-columna">
        <h4>Espesor → metros por tonelada</h4>
        <table className="recepcion-admin-tabla">
          <thead>
            <tr>
              <th>Espesor</th>
              <th>MT x TON</th>
              <th>Peso/m</th>
            </tr>
          </thead>
          <tbody>
            {tablaEspesor.map((e) => (
              <tr key={e.espesor}>
                <td>{e.espesor}</td>
                <td>{e.mtPorTon}</td>
                <td>{e.pesoPorMetro}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <form className="recepcion-admin-form" onSubmit={enviarEspesor}>
          <input
            placeholder="Espesor (ej. 0.25)"
            value={formEspesor.espesor}
            onChange={(e) => setFormEspesor({ ...formEspesor, espesor: e.target.value })}
          />
          <input
            placeholder="MT x TON"
            value={formEspesor.mtPorTon}
            onChange={(e) => setFormEspesor({ ...formEspesor, mtPorTon: e.target.value })}
          />
          <input
            placeholder="Peso/m (kg/m)"
            value={formEspesor.pesoPorMetro}
            onChange={(e) => setFormEspesor({ ...formEspesor, pesoPorMetro: e.target.value })}
          />
          <button className="recepcion-boton-secundario" type="submit">
            Agregar / actualizar
          </button>
        </form>
        <p className="recepcion-texto-ayuda">
          Solo necesitas llenar uno de los dos valores (MT x TON o Peso/m); el sistema
          calcula el otro automáticamente.
        </p>
      </div>
    </div>
  );
}

export default RecepcionVerificacionPage;