import { lazy, Suspense, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAlmacenGlobal } from "./Componentes/AlmacenGlobal.jsx";
import { borrarToken } from "./Utils/auth.js";
import RutaProtegida from "./Componentes/RutaProtegida.jsx";

// Cada módulo se descarga solo al abrir su ruta. Al crecer la aplicación, una
// pantalla nueva no penaliza el primer acceso de los demás usuarios.
const InicioPage = lazy(() => import("./Paginas/InicioPage.jsx"));
const InventarioPage = lazy(() => import("./Paginas/InventarioPage.jsx"));
const RecepcionVerificacionPage = lazy(() => import("./Paginas/RecepcionVerificacionPage.jsx"));
const BodegasPage = lazy(() => import("./Paginas/BodegasPage.jsx"));
const RollosPage = lazy(() => import("./Paginas/RollosPage.jsx"));
const ProduccionPage = lazy(() => import("./Paginas/ProduccionPage.jsx"));
const HojaVidaPage = lazy(() => import("./Paginas/HojaVidaPage.jsx"));
const ReportesPage = lazy(() => import("./Paginas/ReportesPage.jsx"));
const IAPage = lazy(() => import("./Paginas/IAPage.jsx"));

const CLAVE_SESION = "arquitejas_sesion";

function leerSesionGuardada() {
  try {
    const guardada = sessionStorage.getItem(CLAVE_SESION);
    return guardada ? JSON.parse(guardada) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [sesion, setSesionState] = useState(leerSesionGuardada);

  function setSesion(nuevaSesion) {
    setSesionState(nuevaSesion);
    if (nuevaSesion) {
      sessionStorage.setItem(CLAVE_SESION, JSON.stringify(nuevaSesion));
    } else {
      sessionStorage.removeItem(CLAVE_SESION);
    }
  }

  const almacen = useAlmacenGlobal(sesion);

  function cerrarSesion() {
    borrarToken();
    setSesion(null);
  }

  function rutaInicioPara(s) {
    if (!s) return "/";
    return s.rol === "jefe_planta" ? "/produccion" : "/inventario";
  }

  function paginaProtegida(roles, Pagina) {
    return (
      <RutaProtegida sesion={sesion} roles={roles} rutaInicio={rutaInicioPara(sesion)}>
        <Pagina sesion={sesion} onCerrarSesion={cerrarSesion} almacen={almacen} />
      </RutaProtegida>
    );
  }

  return (
    <Suspense fallback={<main aria-live="polite">Cargando módulo...</main>}>
      <Routes>
      <Route
        path="/"
        element={
          sesion ? (
            <Navigate to={rutaInicioPara(sesion)} replace />
          ) : (
            <InicioPage onLogin={setSesion} />
          )
        }
      />
      <Route
        path="/inventario"
        element={paginaProtegida(["administrativo"], InventarioPage)}
      />
      <Route
        path="/recepcion"
        element={paginaProtegida(["administrativo"], RecepcionVerificacionPage)}
      />
      <Route
        path="/bodegas"
        element={paginaProtegida(["administrativo"], BodegasPage)}
      />
      <Route
        path="/rollos"
        element={paginaProtegida(["administrativo"], RollosPage)}
      />
      <Route
        path="/reportes"
        element={paginaProtegida(["administrativo"], ReportesPage)}
      />
      <Route
        path="/ia"
        element={paginaProtegida(["administrativo"], IAPage)}
      />
      <Route
        path="/produccion"
        element={paginaProtegida(["jefe_planta"], ProduccionPage)}
      />
      <Route
        path="/hoja-vida"
        element={paginaProtegida(["administrativo"], HojaVidaPage)}
      />
      <Route path="*" element={<Navigate to={rutaInicioPara(sesion)} replace />} />
      </Routes>
    </Suspense>
  );
}
