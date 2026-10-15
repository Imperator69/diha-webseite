// Startet für die E2E-Tests einen frischen lokalen Worker (eigene D1/R2-Daten unter .wrangler/e2e).
import { execFileSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";

const dir = ".wrangler/e2e";
rmSync(dir, { recursive: true, force: true });
execFileSync("npx", ["wrangler", "d1", "migrations", "apply", "DB", "--local", "--persist-to", dir], { stdio: "inherit", env: { ...process.env, CI: "1" } });
const child = spawn(
  "npx",
  ["wrangler", "dev", "--config", "dist/server/wrangler.json", "--persist-to", dir, "--port", "8788", "--var", "SITE_URL:http://localhost:8788"],
  { stdio: "inherit" },
);
const stop = () => child.kill("SIGTERM");
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
child.on("exit", (code) => process.exit(code ?? 0));
