import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// Suite funcional segura. Para incluir recepción e intercambio con escritura,
// define E2E_MUTACIONES=1 en la base de pruebas antes de ejecutarla.
const cliPlaywright = fileURLToPath(
  new URL("../node_modules/@playwright/test/cli.js", import.meta.url)
);

const proceso = spawn(process.execPath, [cliPlaywright, "test"], {
  stdio: "inherit",
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: "0" },
});

proceso.on("exit", (codigo) => process.exit(codigo ?? 1));
