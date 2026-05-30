import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(scriptDir, "../../..", ".env");
const packageEnv = path.resolve(scriptDir, "..", ".env");

dotenv.config({ path: rootEnv });
dotenv.config({ path: packageEnv, override: false });

const command = process.platform === "win32" ? "prisma.cmd" : "prisma";
const child = spawn(command, process.argv.slice(2), {
  stdio: "inherit",
  shell: true,
  env: process.env
});

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
