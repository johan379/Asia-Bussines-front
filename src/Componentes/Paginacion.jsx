export default function Paginacion({ paginacion, alCambiarPagina, etiqueta = "registros" }) {
  const total = paginacion?.total || 0;
  const pagina = paginacion?.pagina || 1;
  const totalPaginas = paginacion?.total_paginas || 1;

  if (total === 0) return null;

  return (
    <nav className="paginacion" aria-label={`Paginación de ${etiqueta}`}>
      <span className="paginacion-resumen">
        {total} {etiqueta} · página {pagina} de {totalPaginas}
      </span>
      <div className="paginacion-acciones">
        <button type="button" onClick={() => alCambiarPagina(pagina - 1)} disabled={pagina <= 1}>
          Anterior
        </button>
        <button type="button" onClick={() => alCambiarPagina(pagina + 1)} disabled={pagina >= totalPaginas}>
          Siguiente
        </button>
      </div>
    </nav>
  );
}
