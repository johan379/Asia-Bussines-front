type PaginacionDatos = {
  total?: number;
  pagina?: number;
  total_paginas?: number;
};

type Props = {
  paginacion?: PaginacionDatos;
  alCambiarPagina: (pagina: number) => void;
  etiqueta?: string;
};

export default function Paginacion({ paginacion, alCambiarPagina, etiqueta = "registros" }: Props) {
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
