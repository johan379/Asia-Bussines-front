import BarraLateral from "../Componentes/BarraLateral.jsx";
import { useControladorProduccion } from "../Componentes/Produccion.jsx";
import "../Style/Hojadevida.css";

export default function HojaVidaPage({ sesion, onCerrarSesion, almacen }) {
  const p = useControladorProduccion(sesion, almacen);

  const notificaciones = (almacen?.solicitudes || []).filter(
    (s) => s.bodegaPropietariaId === sesion?.bodegaId && s.estado === "pendiente"
  ).length;

  const totalProducciones = p.misProducciones.length;

  return (
    <div className="layout-con-sidebar">
      <BarraLateral
        sesion={sesion}
        onCerrarSesion={onCerrarSesion}
        notificaciones={notificaciones}
      />

      <div className="layout-contenido">
        <div className="hv-page">
          <header className="hv-header">
            <div className="hv-header-texto">
              <h1 className="hv-titulo">Hoja de Vida</h1>
              <p className="hv-subtitulo">
                Reporte de control de material: consulta las producciones registradas en tu bodega.
              </p>
            </div>

            {totalProducciones > 0 && (
              <div className="hv-conteo">
                <strong>{totalProducciones}</strong>
                <span>{totalProducciones === 1 ? "registro" : "registros"}</span>
              </div>
            )}
          </header>

          {totalProducciones > 0 ? (
            <section className="hv-card">
              <h2>Historial de Producción</h2>

              <div className="hv-tabla-wrap">
                <table className="hv-tabla">
                  <thead>
                    <tr>
                      <th>Código de Producción</th>
                      <th>Fecha</th>
                      <th>Responsable</th>
                      <th>Producto Fabricado</th>
                      <th>Modelo</th>
                      <th>Medida</th>
                      <th className="num">Cantidad</th>
                      <th>Código Rollo</th>
                      <th className="num">Metros Consumidos</th>
                      <th className="num">Saldo Restante</th>
                      <th>Observaciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {p.misProducciones.map((prod) => (
                      <tr key={prod.id}>
                        <td>
                          <span className="hv-codigo">{prod.codigoUnico}</span>
                        </td>

                        <td className="hv-fecha">
                          {new Date(prod.fecha).toLocaleDateString("es-CO")}
                        </td>

                        <td>{prod.responsable}</td>
                        <td>{prod.productoFabricado}</td>
                        <td>{prod.modelo}</td>
                        <td>{prod.medidaProducto}</td>
                        <td className="num">{prod.cantidadProductos}</td>

                        <td>
                          <span className="hv-codigo-rollo">{prod.codigoClasificacion}</span>
                        </td>

                        <td className="num hv-metros">{prod.totalMetrosConsumidos} m</td>
                        <td className="num hv-saldo">{prod.saldoCodigo} m</td>

                        <td className="hv-observaciones">{prod.observaciones || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <div className="hv-vacio">
              <div className="hv-vacio-icono">◎</div>
              <p>Todavía no hay producciones registradas en tu bodega.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}