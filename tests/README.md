# Pruebas del proyecto

| Tipo | Comando | Qué cubre |
| --- | --- | --- |
| Unitarias | `npm.cmd run test:unit` | Lógica aislada sin navegador ni base de datos. |
| Validación de datos | `npm.cmd run test:integracion` | Contratos API, validaciones y recuperación de errores. |
| Funcionales / UI / aceptación / regresión | `npm.cmd run test:e2e` | Roles, inventario, recepción, rollos, bodegas, IA y producción. |
| Integración y base de datos | `npm.cmd run test:integracion` | Login, autorización y consultas por bodega. |
| Carga y rendimiento | `npm.cmd run test:carga` | Lecturas concurrentes y percentil 95 de respuesta. |
| Estrés y escalabilidad | `npm.cmd run test:estres` | Incremento controlado de usuarios hasta el límite o error. |

Las pruebas E2E estándar no modifican datos. Los escenarios de recepción e intercambio reales solo se ejecutan con `E2E_MUTACIONES=1`; esta opción es adecuada únicamente para la base de pruebas.

Ejemplos:

```powershell
npm.cmd run test:e2e
npm.cmd run test:unit
npm.cmd run test:integracion
$env:CARGA_USUARIOS="20"; $env:CARGA_DURACION="30"; npm.cmd run test:carga
$env:ESTRES_USUARIOS_MAX="40"; npm.cmd run test:estres
$env:E2E_MUTACIONES="1"; npm.cmd run test:e2e
```
