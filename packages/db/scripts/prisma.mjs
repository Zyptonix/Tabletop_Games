import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, "..");
const rootDir = path.resolve(scriptDir, "../../..");
const rootEnv = path.resolve(rootDir, ".env");
const packageEnv = path.resolve(packageDir, ".env");

dotenv.config({ path: rootEnv });
dotenv.config({ path: packageEnv, override: false });

const require = createRequire(import.meta.url);

let prismaCliPath = null;
try {
  prismaCliPath = require.resolve("prisma/build/index.js", {
    paths: [packageDir, scriptDir, rootDir]
  });
} catch {
  try {
    const pkgPath = require.resolve("prisma/package.json", {
      paths: [packageDir, scriptDir, rootDir]
    });
    prismaCliPath = path.resolve(path.dirname(pkgPath), "build/index.js");
  } catch {
    prismaCliPath = null;
  }
}

let child;
if (prismaCliPath) {
  child = spawn(process.execPath, [prismaCliPath, ...process.argv.slice(2)], {
    stdio: "inherit",
    env: process.env
  });
} else {
  const command = process.platform === "win32" ? "prisma.cmd" : "prisma";
  child = spawn(command, process.argv.slice(2), {
    stdio: "inherit",
    shell: true,
    env: process.env
  });
}

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
