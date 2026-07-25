import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import InicioPage from "./Paginas/InicioPage.jsx";
import InventarioPage from "./Paginas/InventarioPage.jsx";
import RecepcionVerificacionPage from "./Paginas/RecepcionVerificacionPage.jsx";

// Componente raíz: define las rutas de la app y guarda quién inició sesión.
export default function App() {
  // Cuando exista backend, sesion vendrá con los datos reales del usuario/bodega
  // que devuelva el login. Por ahora se guarda en memoria (se pierde al recargar).
  const [sesion, setSesion] = useState(null); // { correo, bodegaId, bodegaNombre } | null

  // Borra la sesión activa; esto hace que las rutas protegidas redirijan al login.
  function cerrarSesion() {
    setSesion(null);
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          sesion ? (
            <Navigate to="/inventario" replace />
          ) : (
            <InicioPage onLogin={setSesion} />
          )
        }
      />
      <Route
        path="/inventario"
        element={
          sesion ? (
            <InventarioPage sesion={sesion} onCerrarSesion={cerrarSesion} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/recepcion"
        element={
          sesion ? (
            <RecepcionVerificacionPage sesion={sesion} onCerrarSesion={cerrarSesion} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      {/* Cualquier otra ruta redirige al inicio */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}