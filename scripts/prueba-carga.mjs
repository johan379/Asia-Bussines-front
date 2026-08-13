import { fileURLToPath } from "node:url";

const apiUrl = process.env.API_URL || "http://localhost:8000";
const concurrencia = Math.max(1, Number(process.env.CARGA_USUARIOS || 10));
const duracionSegundos = Math.max(1, Number(process.env.CARGA_DURACION || 20));
const correo = process.env.RICAURTE_ADMIN_EMAIL || "ricaurte@gmail.com";
const contrasena = process.env.RICAURTE_ADMIN_PASSWORD || "123456789";
const rutas = ["/inventario/productos", "/rollos", "/bodegas", "/inventario/historial"];

async function login() {
  const respuesta = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correo, contrasena }),
  });
  if (!respuesta.ok) throw new Error(`No se pudo iniciar sesión: HTTP ${respuesta.status}`);
  return (await respuesta.json()).access_token;
}

export async function ejecutarCarga({ usuarios = concurrencia, segundos = duracionSegundos, escalonado = false } = {}) {
  const token = await login();
  const limite = Date.now() + segundos * 1000;
  const resultados = { total: 0, correctas: 0, errores: 0, tiempos: [] };

  async function trabajador(indice) {
    let posicion = indice % rutas.length;
    while (Date.now() < limite) {
      const inicio = performance.now();
      try {
        const respuesta = await fetch(`${apiUrl}${rutas[posicion++ % rutas.length]}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        resultados.total += 1;
        if (respuesta.ok) resultados.correctas += 1;
        else resultados.errores += 1;
      } catch {
        resultados.total += 1;
        resultados.errores += 1;
      } finally {
        resultados.tiempos.push(performance.now() - inicio);
      }
    }
  }

  const inicio = performance.now();
  if (escalonado) {
    for (let usuariosActuales = 1; usuariosActuales <= usuarios; usuariosActuales += 5) {
      await Promise.all(Array.from({ length: usuariosActuales }, (_, indice) => trabajador(indice)));
    }
  } else {
    await Promise.all(Array.from({ length: usuarios }, (_, indice) => trabajador(indice)));
  }
  const duracionReal = (performance.now() - inicio) / 1000;
  const ordenados = resultados.tiempos.sort((a, b) => a - b);
  const percentil = (p) => ordenados[Math.min(ordenados.length - 1, Math.floor(ordenados.length * p))] || 0;
  const resumen = {
    modo: escalonado ? "estrés escalonado" : "carga constante",
    usuarios,
    duracionSegundos: Number(duracionReal.toFixed(2)),
    solicitudes: resultados.total,
    correctas: resultados.correctas,
    errores: resultados.errores,
    disponibilidad: resultados.total ? Number(((resultados.correctas / resultados.total) * 100).toFixed(2)) : 0,
    solicitudesPorSegundo: Number((resultados.total / duracionReal).toFixed(2)),
    promedioMs: Number((resultados.tiempos.reduce((suma, tiempo) => suma + tiempo, 0) / resultados.tiempos.length || 0).toFixed(2)),
    p95Ms: Number(percentil(0.95).toFixed(2)),
    maxMs: Number(percentil(1).toFixed(2)),
  };
  console.table(resumen);
  if (resumen.errores > 0) process.exitCode = 1;
  return resumen;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await ejecutarCarga();
}
