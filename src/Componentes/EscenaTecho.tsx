function EscenaTecho() {
  return (
    <svg
      className="techo-escena"
      viewBox="0 0 200 100"
      aria-hidden="true"
      focusable="false"
    >
      {/* Cabios del techo: lado izquierdo sin terminar, lado derecho en construcción */}
      <g className="techo-armazon">
        <line x1="100" y1="12" x2="14" y2="78" />
        <line x1="100" y1="12" x2="186" y2="78" />
        <line x1="60.1" y1="31.3" x2="71.1" y2="45.5" />
        <line x1="38.6" y1="47.8" x2="49.6" y2="62" />
      </g>

      {/* Tejas ya colocadas, alineadas a la pendiente derecha */}
      <g className="techo-tejas-fijas" transform="translate(100, 12) rotate(37.5)">
        <rect x="87.5" y="-28" width="9" height="16" rx="2.5" />
        <rect x="87.5" y="-8" width="9" height="16" rx="2.5" />
        <rect x="87.5" y="12" width="9" height="16" rx="2.5" />
        <rect x="77.5" y="-28" width="9" height="16" rx="2.5" />
        <rect x="77.5" y="-8" width="9" height="16" rx="2.5" />
        <rect x="77.5" y="12" width="9" height="16" rx="2.5" />
        <rect x="67.5" y="-28" width="9" height="16" rx="2.5" />
        <rect x="67.5" y="-8" width="9" height="16" rx="2.5" />
      </g>

      {/* Teja siendo colocada: completa la hilera superior */}
      <g transform="translate(100, 12) rotate(37.5)">
        <rect className="techo-teja-animada" x="67.5" y="12" width="9" height="16" rx="2.5" />
      </g>
    </svg>
  );
}

export default EscenaTecho;
