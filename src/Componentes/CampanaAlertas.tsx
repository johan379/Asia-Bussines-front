import { useEffect, useRef, useState } from "react";
import "../Style/CampanaAlertas.css";
import type { Producto } from "../types/dominio";

/**
 * Campana de alertas de stock bajo: muestra cuántos productos (de mi bodega)
 * están por debajo de su `stockMinimo` configurado y, al hacer clic, el
 * detalle de cuáles son. `stockMinimo` es opcional por producto — un
 * producto sin configurar nunca aparece aquí.
 */
function CampanaAlertas({ alertas, cargando, unidadPorFamilia }: { alertas: Producto[]; cargando: boolean; unidadPorFamilia?: Record<string, string> }) {
  const [abierta, setAbierta] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function alHacerClicFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) setAbierta(false);
    }
    document.addEventListener("mousedown", alHacerClicFuera);
    return () => document.removeEventListener("mousedown", alHacerClicFuera);
  }, []);

  const cantidad = alertas.length;

  return (
    <div className="campana-alertas" ref={contenedorRef}>
      <button
        type="button"
        className="campana-alertas-boton"
        onClick={() => setAbierta((actual) => !actual)}
        title="Alertas de stock bajo"
      >
        🔔
        {cantidad > 0 && <span className="campana-alertas-badge">{cantidad}</span>}
      </button>

      {abierta && (
        <div className="campana-alertas-panel">
          <h4>Alertas de stock bajo</h4>
          {cargando ? (
            <p className="campana-alertas-vacio">Cargando...</p>
          ) : cantidad === 0 ? (
            <p className="campana-alertas-vacio">No hay productos por debajo de su stock mínimo.</p>
          ) : (
            <ul className="campana-alertas-lista">
              {alertas.map((p) => (
                <li key={p.id}>
                  <strong>{p.codigo}</strong> — {p.descripcion}
                  <br />
                  <span className="campana-alertas-detalle">
                    Stock actual: {p.stock} {unidadPorFamilia?.[p.familia] || ""} · Mínimo: {p.stockMinimo} {unidadPorFamilia?.[p.familia] || ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default CampanaAlertas;
