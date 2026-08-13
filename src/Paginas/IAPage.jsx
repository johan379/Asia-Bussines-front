import { useCallback, useEffect, useState } from "react";
import BarraLateral from "../Componentes/BarraLateral.jsx";
import { api, ErrorApi } from "../Componentes/Api";
import { alertaIaDesdeApi } from "../Componentes/Mapeo";
import "../Style/IA.css";

const PREGUNTAS_SUGERIDAS = [
  { icono: "↓", titulo: "Stock bajo", texto: "¿Qué productos tienen el stock más bajo?" },
  { icono: "↔", titulo: "Movimientos", texto: "Hazme un resumen de los movimientos de esta semana" },
  { icono: "◌", titulo: "Rollos", texto: "¿Cuántos rollos tengo disponibles para producción?" },
  { icono: "↗", titulo: "Planeación", texto: "¿Qué debería reabastecer pronto?" },
];

let siguienteIdMensaje = 1;
function generarIdMensaje() {
  return `msg-${Date.now()}-${siguienteIdMensaje++}`;
}

function horaMensaje(fecha) {
  return new Date(fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function useControladorIa(sesion) {
  const [mensajes, setMensajes] = useState([]);
  const [textoChat, setTextoChat] = useState("");
  const [enviandoChat, setEnviandoChat] = useState(false);
  const [errorChat, setErrorChat] = useState("");

  async function enviarTexto(texto) {
    const limpio = texto.trim();
    if (!limpio || enviandoChat) return;

    setErrorChat("");
    const mensajeUsuario = { id: generarIdMensaje(), rol: "usuario", texto: limpio, fecha: new Date().toISOString() };
    const historialParaApi = [...mensajes, mensajeUsuario].map((m) => ({ rol: m.rol, texto: m.texto }));

    setMensajes((actual) => [...actual, mensajeUsuario]);
    setTextoChat("");
    setEnviandoChat(true);

    try {
      const respuesta = await api.post("/ia/chat", {
        mensaje: limpio,
        historial: historialParaApi,
        bodega_id: sesion?.bodegaId ?? null,
      });
      setMensajes((actual) => [
        ...actual,
        { id: generarIdMensaje(), rol: "ia", texto: respuesta.respuesta, fecha: new Date().toISOString() },
      ]);
    } catch (err) {
      setErrorChat(err instanceof ErrorApi ? err.message : "No se pudo obtener respuesta del asistente.");
    } finally {
      setEnviandoChat(false);
    }
  }

  const enviarMensaje = (evento) => {
    evento.preventDefault();
    enviarTexto(textoChat);
  };

  const [alertas, setAlertas] = useState([]);
  const [cargandoAlertas, setCargandoAlertas] = useState(true);
  const cargarAlertas = useCallback(async () => {
    setCargandoAlertas(true);
    try {
      setAlertas((await api.get("/ia/alertas")).map(alertaIaDesdeApi));
    } catch {
      setAlertas([]);
    } finally {
      setCargandoAlertas(false);
    }
  }, []);

  useEffect(() => { cargarAlertas(); }, [cargarAlertas]);

  return {
    mensajes, textoChat, setTextoChat, enviandoChat, errorChat,
    enviarMensaje, enviarSugerencia: enviarTexto,
    limpiarChat: () => { setMensajes([]); setErrorChat(""); },
    alertas, cargandoAlertas,
  };
}

function IAPage({ sesion, onCerrarSesion }) {
  const ia = useControladorIa(sesion);
  const [alertaExpandida, setAlertaExpandida] = useState(false);
  const alertasCriticas = ia.alertas.filter((a) => a.nivel === "critico");

  return (
    <div className="layout-con-sidebar">
      <BarraLateral sesion={sesion} onCerrarSesion={onCerrarSesion} notificaciones={alertasCriticas.length} />
      <main className="layout-contenido">
        <div className="ia-page">
          <header className="ia-hero">
            <div className="ia-identidad">
              <div className="ia-avatar ia-avatar-principal" aria-hidden="true">✦</div>
              <div>
                <p className="ia-eyebrow">ARQUITEJAS · INTELIGENCIA DE NEGOCIO</p>
                <h1 className="ia-titulo">Asistente de operaciones</h1>
                <p className="ia-subtitulo">Consulta el estado de {sesion?.bodegaNombre || "tu bodega"} y toma decisiones con tus datos.</p>
              </div>
            </div>
            <div className="ia-estado"><span className="ia-estado-punto" /> Disponible ahora</div>
          </header>

          {alertasCriticas.length > 0 && (
            <section className="ia-alerta-banner">
              <button className="ia-alerta-banner-boton" onClick={() => setAlertaExpandida((valor) => !valor)}>
                <span className="ia-alerta-icono">!</span>
                <span><strong>Atención requerida</strong><small>{alertasCriticas.length} {alertasCriticas.length === 1 ? "alerta crítica" : "alertas críticas"} de inventario</small></span>
                <span className="ia-alerta-banner-flecha">{alertaExpandida ? "⌃" : "⌄"}</span>
              </button>
              {alertaExpandida && (
                <ul className="ia-alerta-banner-lista">
                  {alertasCriticas.map((alerta) => <li key={alerta.id}><strong>{alerta.titulo}</strong><span>{alerta.mensaje}</span></li>)}
                </ul>
              )}
            </section>
          )}

          <section className="ia-chat-panel" aria-label="Chat con asistente de operaciones">
            <div className="ia-chat-cabecera">
              <div className="ia-avatar ia-avatar-chat" aria-hidden="true">✦</div>
              <div><strong>Asistente Arquitejas</strong><span>Inventario, rollos y abastecimiento</span></div>
              {ia.mensajes.length > 0 && <button className="ia-limpiar" type="button" onClick={ia.limpiarChat}>Nueva consulta</button>}
            </div>

            <div className="ia-chat-mensajes" aria-live="polite">
              {ia.mensajes.length === 0 ? (
                <div className="ia-bienvenida">
                  <div className="ia-bienvenida-icono" aria-hidden="true">✦</div>
                  <h2>¿Qué deseas revisar hoy?</h2>
                  <p>Puedo ayudarte a entender el inventario, los rollos disponibles y las prioridades de abastecimiento.</p>
                  <div className="ia-sugerencias">
                    {PREGUNTAS_SUGERIDAS.map((pregunta) => (
                      <button key={pregunta.titulo} className="ia-sugerencia-chip" onClick={() => ia.enviarSugerencia(pregunta.texto)} disabled={ia.enviandoChat}>
                        <span className="ia-sugerencia-icono" aria-hidden="true">{pregunta.icono}</span>
                        <span><strong>{pregunta.titulo}</strong><small>{pregunta.texto}</small></span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : ia.mensajes.map((mensaje) => (
                <article key={mensaje.id} className={`ia-mensaje ia-mensaje-${mensaje.rol}`}>
                  {mensaje.rol === "ia" && <div className="ia-avatar ia-avatar-mensaje" aria-hidden="true">✦</div>}
                  <div className="ia-mensaje-contenido">
                    <p>{mensaje.texto}</p>
                    <time dateTime={mensaje.fecha}>{mensaje.rol === "ia" ? "Asistente · " : "Tú · "}{horaMensaje(mensaje.fecha)}</time>
                  </div>
                </article>
              ))}
              {ia.enviandoChat && (
                <article className="ia-mensaje ia-mensaje-ia ia-mensaje-cargando">
                  <div className="ia-avatar ia-avatar-mensaje" aria-hidden="true">✦</div>
                  <div className="ia-typing"><span /><span /><span /></div>
                </article>
              )}
            </div>

            {ia.errorChat && <p className="ia-error" role="alert">No pude completar la consulta: {ia.errorChat}</p>}

            <form className="ia-chat-form" onSubmit={ia.enviarMensaje}>
              <input type="text" placeholder="Pregunta por el inventario, rollos o abastecimiento…" value={ia.textoChat} onChange={(e) => ia.setTextoChat(e.target.value)} disabled={ia.enviandoChat} />
              <button type="submit" className="ia-boton-enviar" disabled={ia.enviandoChat || !ia.textoChat.trim()} aria-label="Enviar pregunta">↑</button>
            </form>
            <p className="ia-nota">Las respuestas se generan con la información registrada en tu bodega.</p>
          </section>
        </div>
      </main>
    </div>
  );
}

export default IAPage;
