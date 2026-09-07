// @ts-nocheck -- contrato de controlador pendiente de centralizar.
import { anchoPorSeccion, SECCIONES_POR_TIPO_PRODUCTO } from "../Utils/produccion";

// Sección "Producción confirmada" de Producción: resumen mostrado tras
// registrar exitosamente una producción. Extraído de ProduccionPage.tsx sin
// cambiar props ni comportamiento -- no usa estado local propio, todo viene
// del controlador (useControladorProduccion) vía props.
function PanelProduccionConfirmada({ produccionConfirmada, iniciarNuevoRegistro }) {
  return (
    <section className="produccion-tarjeta produccion-confirmacion">
      <h2>✓ Producción {produccionConfirmada.codigoUnico} registrada</h2>
      <p>
        Se consumieron <strong>{produccionConfirmada.totalMetrosConsumidos} m</strong> de{" "}
        {produccionConfirmada.rollosUtilizados.length} rollo
        {produccionConfirmada.rollosUtilizados.length === 1 ? "" : "s"} del código{" "}
        <strong>{produccionConfirmada.codigoClasificacion}</strong>, obteniendo{" "}
        <strong>
          {produccionConfirmada.cantidadProductos} {produccionConfirmada.modelo}
        </strong>{" "}
        ({produccionConfirmada.medidaProducto}).
      </p>
      <p>
        Saldo restante en el/los rollo{produccionConfirmada.rollosUtilizados.length === 1 ? "" : "s"} que
        usaste:{" "}
        <strong>{produccionConfirmada.saldoCodigo} m</strong>. Responsable:{" "}
        <strong>{produccionConfirmada.responsable}</strong>.
      </p>
      <ul className="produccion-detalle-lista">
        {produccionConfirmada.rollosUtilizados.map((r) => (
          <li key={r.rolloId}>
            Rollo {r.identificadorRollo}: {r.metrosConsumidos} m
          </li>
        ))}
      </ul>

      {produccionConfirmada.metrosExcedente > 0 && (
        <p className="produccion-texto-ayuda">
          De esos metros, <strong>{produccionConfirmada.metrosExcedente} m</strong> superaron lo que el
          apartado necesitaba — el reservado del apartado quedó en 0, sin números negativos.
        </p>
      )}

      {produccionConfirmada.productosStock.length > 0 && (
        <>
          <h3>Stock adicional generado</h3>
          <div className="produccion-tabla-wrap">
            <table className="produccion-tabla">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Familia</th>
                  <th>Rollo origen</th>
                  <th>Longitud</th>
                  <th>Ancho rollo / sección</th>
                  <th>Cantidad</th>
                  <th>Calidad</th>
                  <th>Motivo (Segunda)</th>
                </tr>
              </thead>
              <tbody>
                {produccionConfirmada.productosStock.map((s) => (
                  <tr key={s.id}>
                    <td>{s.codigo}</td>
                    <td>{s.descripcion}</td>
                    <td>{SECCIONES_POR_TIPO_PRODUCTO[s.tipoProducto] ? s.tipoProducto.toUpperCase() + "S" : produccionConfirmada.codigoClasificacion}</td>
                    <td>{s.codigoRolloOrigen || produccionConfirmada.codigoClasificacion}</td>
                    <td>{s.metrosPorUnidad != null ? `${s.metrosPorUnidad} m` : "—"}</td>
                    <td>
                      {s.anchoRollo != null && anchoPorSeccion(s.anchoRollo, s.tipoProducto) != null
                        ? `${s.anchoRollo} m / ${anchoPorSeccion(s.anchoRollo, s.tipoProducto)} m`
                        : "—"}
                    </td>
                    <td>{s.stock} unidad{s.stock === 1 ? "" : "es"}</td>
                    <td style={{ textTransform: "capitalize" }}>{s.calidad}</td>
                    <td>{s.motivoSegunda || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="produccion-texto-ayuda">
            Este stock ya quedó disponible en el inventario de tu bodega.
          </p>
        </>
      )}

      <button className="produccion-boton-primario" onClick={iniciarNuevoRegistro}>
        Registrar otra producción
      </button>
    </section>
  );
}

export default PanelProduccionConfirmada;
