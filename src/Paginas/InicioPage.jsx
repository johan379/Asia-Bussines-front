import { useControladorInicio } from "../Componentes/Inicio.jsx";
import "../Style/Inicio.css";

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

       
      </div>
    </div>
  );
}

export default InicioPage;
