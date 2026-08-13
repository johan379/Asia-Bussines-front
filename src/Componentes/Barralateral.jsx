import { Link, useLocation } from "react-router-dom";
import "../Style/BarraLateral.css";

// Módulos según el documento de requerimientos. Los que aún no están
// construidos quedan visibles pero deshabilitados con la etiqueta
// "Próximamente", para que se vea el mapa completo del sistema.
//
// "soloRol" restringe un módulo a un rol específico de la sesión
// (sesion.rol): "jefe_planta" ve Registrar Producción, "administrativo" ve
// Hoja de Vida en su lugar. El resto de módulos los ve cualquier rol,
// porque siguen siendo trabajo propio de la bodega.
const MODULOS = [
  { clave: "inventario", etiqueta: "Inventario", ruta: "/inventario", disponible: true },
  {
    clave: "recepcion",
    etiqueta: "Recepción y Verificación",
    ruta: "/recepcion",
    disponible: true,
  },
  { clave: "bodegas", etiqueta: "Bodegas", ruta: "/bodegas", disponible: true, notificable: true },
  { clave: "rollos", etiqueta: "Rollos almacenados", ruta: "/rollos", disponible: true },
  { clave: "reportes", etiqueta: "Reportes", ruta: "/reportes", disponible: true },
  { clave: "ia", etiqueta: "Asistente de IA", ruta: "/ia", disponible: true },
  {
    clave: "produccion",
    etiqueta: "Registrar Producción",
    ruta: "/produccion",
    disponible: true,
    soloRol: "jefe_planta",
  },
  {
    clave: "hoja_vida",
    etiqueta: "Hoja de Vida",
    ruta: "/hoja-vida",
    disponible: true,
    soloRol: "administrativo",
  },
  
];

function BarraLateral({ sesion, onCerrarSesion, notificaciones = 0 }) {
  const location = useLocation();

  const modulosVisibles = MODULOS.filter((m) => !m.soloRol || m.soloRol === sesion?.rol);

  return (
    <aside className="barra-lateral">
      <div className="barra-marca">
        <span className="barra-marca-icono">◆</span> Arquitejas
      </div>
      <p className="barra-bodega">{sesion?.bodegaNombre || "—"}</p>

      <nav className="barra-nav">
  {modulosVisibles.map((modulo) =>
    modulo.disponible ? (
      <div key={modulo.clave} className="barra-item-grupo">
        <Link
          to={modulo.ruta}
          className={`barra-item ${
            location.pathname === modulo.ruta ? "barra-item-activo" : ""
          }`}
        >
          <span>{modulo.etiqueta}</span>
          {modulo.notificable && notificaciones > 0 && (
            <span className="barra-notificacion">{notificaciones}</span>
          )}
        </Link>
        {modulo.clave === "inventario" && (
          <p className="barra-item-nota">Productos · Movimientos · Historial</p>
        )}
      </div>
    ) : null
  )}
</nav>

      <button className="barra-boton-salir" onClick={onCerrarSesion}>
        Cerrar sesión
      </button>
    </aside>
  );
}

export default BarraLateral;