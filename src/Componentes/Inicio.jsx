import { useState } from "react";

// TODO: cuando exista el backend, reemplazar esta validación local por una
// llamada real a la API de autenticación (ej. POST /api/login), que debe
// devolver el usuario y la bodega asociada a su cuenta.
const USUARIOS_DEMO = [
  { correo: "central@arquitejas.com", contrasena: "123456", bodegaId: 1, bodegaNombre: "Bodega Central" },
  { correo: "norte@arquitejas.com", contrasena: "123456", bodegaId: 2, bodegaNombre: "Bodega Norte" },
];

// Hook que maneja toda la lógica del login: guarda lo que el usuario escribe,
// valida los datos y simula el inicio de sesión.
export function useControladorInicio(onLogin) {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

    // Revisa que el correo y la contraseña tengan un formato válido antes de enviar.
  function validarCampos() {
    if (!correo.trim()) return "El correo es obligatorio.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return "El correo no es válido.";
    if (!contrasena) return "La contraseña es obligatoria.";
    if (contrasena.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
    return "";
  }

    // Se ejecuta al enviar el formulario: valida, simula una espera de red,
    // busca el usuario y si coincide, avisa a App.jsx que ya inició sesión.
  async function iniciarSesion(evento) {
    evento.preventDefault();
    const mensajeError = validarCampos();
    if (mensajeError) {
      setError(mensajeError);
      return;
    }

    setError("");
    setCargando(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));

      const usuario = USUARIOS_DEMO.find(
        (u) => u.correo === correo && u.contrasena === contrasena
      );

      if (!usuario) {
        setError("Correo o contraseña incorrectos.");
        return;
      }

      onLogin?.({
        correo: usuario.correo,
        bodegaId: usuario.bodegaId,
        bodegaNombre: usuario.bodegaNombre,
      });
    } catch (err) {
      setError("No se pudo iniciar sesión. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return {
    correo,
    setCorreo,
    contrasena,
    setContrasena,
    error,
    cargando,
    iniciarSesion,
  };
}