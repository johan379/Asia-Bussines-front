import { Navigate } from "react-router-dom";

/** Centraliza la protección de rutas para que un módulo nuevo no repita la
 * misma lógica de sesión, rol y redirección. La API sigue siendo la fuente de
 * autorización; esto solo protege la navegación de la interfaz. */
export default function RutaProtegida({ sesion, roles, rutaInicio, children }) {
  if (!sesion) return <Navigate to="/" replace />;
  if (roles && !roles.includes(sesion.rol)) return <Navigate to={rutaInicio} replace />;
  return children;
}
