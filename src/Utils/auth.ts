const CLAVE_TOKEN = "arquitejas_token";

export function guardarToken(token: string) {
  sessionStorage.setItem(CLAVE_TOKEN, token);
}

export function obtenerToken() {
  return sessionStorage.getItem(CLAVE_TOKEN);
}

export function borrarToken() {
  sessionStorage.removeItem(CLAVE_TOKEN);
}
