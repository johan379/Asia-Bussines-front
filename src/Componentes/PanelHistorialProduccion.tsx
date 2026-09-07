// @ts-nocheck -- contrato de controlador pendiente de centralizar.
import { formatearFechaColombia } from "../Utils/fechas";
import { filasStockAdicional } from "../Utils/produccion";

// Sección "Producciones registradas" (historial) de Producción. Extraído de
// ProduccionPage.tsx sin cambiar props ni comportamiento -- no usa estado
// local propio, todo viene del controlador (useControladorProduccion) vía
// props.
function PanelHistorialProduccion({ misProducciones }) {
  if (misProducciones.length === 0) {
    return <p className="produccion-vacio">Todavía no hay producciones registradas en tu bodega.</p>;
  }

  return (
    <section className="produccion-tarjeta produccion-tabla-wrap">
      <h2>Producciones registradas</h2>
      <table className="produccion-tabla produccion-tabla-historial">
        <thead>
          <tr>
            <th>Código único</th>
            <th>Cotización</th>
            <th>Cliente</th>
            <th>Fecha</th>
            <th>Modelo</th>
            <th>Cantidad</th>
            <th>Medida</th>
            <th>Código clasificación</th>
            <th>Referencia</th>
            <th>Metros usados</th>
            <th>Saldo del rollo</th>
            <th>Responsable</th>
            <th>Observación</th>
          </tr>
        </thead>
        <tbody>
          {misProducciones.flatMap((prod) => [
            <tr key={prod.id}>
              <td>{prod.codigoUnico}</td>
              <td>{prod.cotizacion || "—"}</td>
              <td>{prod.clienteApartado || "—"}</td>
              <td>{formatearFechaColombia(prod.fecha)}</td>
              <td>{prod.modelo || "—"}</td>
              <td>{prod.cantidadProductos}</td>
              <td>{prod.medidaProducto || "—"}</td>
              <td>{prod.codigoClasificacion}</td>
              <td>{prod.rollosUtilizados.map((r) => r.identificadorRollo).join(", ")}</td>
              <td>{prod.totalMetrosConsumidos}</td>
              <td>{prod.saldoCodigo}</td>
              <td>{prod.responsable}</td>
              <td>{prod.observaciones || "—"}</td>
            </tr>,
            ...filasStockAdicional(prod).map((fila) => (
              <tr key={fila.key} className="produccion-fila-stock">
                <td>{fila.codigoProduccion}</td>
                <td className="produccion-cotizacion-stock">{fila.cotizacion}</td>
                <td>{fila.cliente}</td>
                <td>{formatearFechaColombia(fila.fecha)}</td>
                <td>{fila.modelo || "—"}</td>
                <td>{fila.cantidad}</td>
                <td>{fila.medida || "—"}</td>
                <td>{fila.codigoClasificacion}</td>
                <td>{fila.referencia}</td>
                <td>{fila.metrosConsumidos}</td>
                <td>{fila.saldoRestante}</td>
                <td>{fila.responsable}</td>
                <td>{fila.observaciones}</td>
              </tr>
            )),
          ])}
        </tbody>
      </table>
    </section>
  );
}

export default PanelHistorialProduccion;
