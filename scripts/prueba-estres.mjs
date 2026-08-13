import { ejecutarCarga } from "./prueba-carga.mjs";

const usuariosMaximos = Math.max(5, Number(process.env.ESTRES_USUARIOS_MAX || 30));
const segundosPorNivel = Math.max(2, Number(process.env.ESTRES_DURACION_NIVEL || 8));

for (let usuarios = 5; usuarios <= usuariosMaximos; usuarios += 5) {
  console.log(`\nNivel de estrés: ${usuarios} usuarios concurrentes`);
  const resumen = await ejecutarCarga({ usuarios, segundos: segundosPorNivel });
  if (resumen.disponibilidad < 95) {
    console.log("Se detiene el estrés: disponibilidad inferior al 95%.");
    break;
  }
}
