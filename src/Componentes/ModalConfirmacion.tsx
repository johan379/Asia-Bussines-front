import { useEffect } from "react";
import "../Style/ModalConfirmacion.css";

type Props = {
  titulo?: string;
  mensaje: string;
  textoConfirmar?: string;
  // Si no se pasa, el modal queda en modo informativo: un solo botón.
  textoCancelar?: string;
  onConfirmar: () => void;
  onCancelar?: () => void;
};

/** Diálogo genérico (informativo de 1 botón, o confirmación Sí/No de 2) para
 * reemplazar window.alert()/window.confirm() con el mismo estilo visual que
 * ya usan los modales de Rollos (rollos-modal-*) -- sin acoplarse a esa
 * hoja de estilos porque este se usa desde páginas distintas. */
function ModalConfirmacion({ titulo, mensaje, textoConfirmar = "Aceptar", textoCancelar, onConfirmar, onCancelar }: Props) {
  const cerrar = onCancelar || onConfirmar;

  useEffect(() => {
    function alPresionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") cerrar();
    }
    document.addEventListener("keydown", alPresionarTecla);
    return () => document.removeEventListener("keydown", alPresionarTecla);
  }, [cerrar]);

  return (
    <div className="modal-confirmacion-fondo" onClick={cerrar}>
      <div
        className="modal-confirmacion"
        role="dialog"
        aria-modal="true"
        aria-label={titulo || mensaje}
        onClick={(evento) => evento.stopPropagation()}
      >
        {titulo && <h3>{titulo}</h3>}
        <p className="modal-confirmacion-mensaje">{mensaje}</p>
        <div className="modal-confirmacion-acciones">
          {textoCancelar && (
            <button type="button" className="modal-confirmacion-boton-secundario" onClick={onCancelar}>
              {textoCancelar}
            </button>
          )}
          <button type="button" className="modal-confirmacion-boton-primario" onClick={onConfirmar}>
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalConfirmacion;
