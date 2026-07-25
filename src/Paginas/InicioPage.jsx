import { useControladorInicio } from "../Componentes/Inicio.jsx";
import "../Style/Inicio.css";

// Pantalla de login: dibuja el formulario y usa la lógica de useControladorInicio.
function InicioPage({ onLogin }) {
  const {
    correo,
    setCorreo,
    contrasena,
    setContrasena,
    error,
    cargando,
    iniciarSesion,
  } = useControladorInicio(onLogin);

  return (
    <div className="inicio-page">
      <div className="inicio-panel">
        <span className="inicio-marca">◆</span>
        <h1 className="inicio-titulo">Bienvenido  Arquitejas</h1>
        <p className="inicio-subtitulo">Ingresa tus datos para continuar</p>

        <form className="inicio-form" onSubmit={iniciarSesion} noValidate>
          <label className="inicio-label" htmlFor="correo">
            Correo electrónico
          </label>
          <input
            id="correo"
            type="email"
            className="inicio-input"
            placeholder="tu@correo.com"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />

          <label className="inicio-label" htmlFor="contrasena">
            Contraseña
          </label>
          <input
            id="contrasena"
            type="password"
            className="inicio-input"
            placeholder="••••••••"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
          />

          {error && <p className="inicio-error">{error}</p>}

          <button type="submit" className="inicio-boton" disabled={cargando}>
            {cargando ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        {/* Solo mientras no hay backend: recordatorio de las cuentas demo */}
        <p className="inicio-subtitulo" style={{ marginTop: "1.25rem", fontSize: "0.75rem" }}>
          Demo: central@arquitejas.com / norte@arquitejas.com — contraseña 123456
        </p>
      </div>
    </div>
  );
}

export default InicioPage;