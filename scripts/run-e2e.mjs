import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const cliPlaywright = fileURLToPath(new URL("../node_modules/@playwright/test/cli.js", import.meta.url));
const proceso = spawn(process.execPath, [cliPlaywright, "test"], {
  stdio: "inherit",
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: "0" },
});

proceso.on("exit", (codigo) => process.exit(codigo ?? 1));
