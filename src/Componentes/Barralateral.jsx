import { Link, useLocation } from "react-router-dom";
import "../Style/BarraLateral.css";

// Módulos según el documento de requerimientos. Los que aún no están
// construidos quedan visibles pero deshabilitados con la etiqueta
// "Próximamente", para que se vea el mapa completo del sistema.
const MODULOS = [
  { clave: "inventario", etiqueta: "Inventario", ruta: "/inventario", disponible: true },
  {
    clave: "recepcion",
    etiqueta: "Recepción y Verificación",
    ruta: "/recepcion",
    disponible: true,
  },
  
];

// Menú lateral que aparece en todas las páginas internas (Inventario, Recepción, etc.).
// Muestra el logo, la bodega activa, los módulos del sistema y el botón de salir.
function BarraLateral({ sesion, onCerrarSesion }) {
  const location = useLocation();

  return (
    <aside className="barra-lateral">
      <div className="barra-marca">
        <span className="barra-marca-icono">◆</span> Arquitejas
      </div>
      <p className="barra-bodega">{sesion?.bodegaNombre || "—"}</p>

      <nav className="barra-nav">
        {MODULOS.map((modulo) =>
          modulo.disponible ? (
            <div key={modulo.clave} className="barra-item-grupo">
              <Link
                to={modulo.ruta}
                className={`barra-item ${
                  location.pathname === modulo.ruta ? "barra-item-activo" : ""
                }`}
              >
                {modulo.etiqueta}
              </Link>
              
            </div>
          ) : (
            <span key={modulo.clave} className="barra-item barra-item-deshabilitado">
              {modulo.etiqueta}
              <span className="barra-badge">Próximamente</span>
            </span>
          )
        )}
      </nav>

      <button className="barra-boton-salir" onClick={onCerrarSesion}>
        Cerrar sesión
      </button>
    </aside>
  );
}

export default BarraLateral;