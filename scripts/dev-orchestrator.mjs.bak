import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logsDir = path.join(rootDir, "logs", "dev");
const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);

function readOption(name) {
  const inlinePrefix = `--${name}=`;
  const inline = rawArgs.find((arg) => arg.startsWith(inlinePrefix));
  if (inline) return inline.slice(inlinePrefix.length);

  const index = rawArgs.indexOf(`--${name}`);
  if (index >= 0 && rawArgs[index + 1] && !rawArgs[index + 1].startsWith("--")) {
    return rawArgs[index + 1];
  }

  return null;
}

function parseOnlyServices() {
  const selected = new Set();
  const only = readOption("only") ?? readOption("service");

  if (only) {
    for (const entry of only.split(",")) {
      const name = entry.trim().toLowerCase();
      if (name) selected.add(name);
    }
  }

  if (args.has("--web-only")) selected.add("web");
  if (args.has("--server-only")) selected.add("server");
  if (args.has("--backend-only")) selected.add("server");
  if (args.has("--proxy-only")) selected.add("proxy");
  if (args.has("--postgres-only") || args.has("--db-only")) selected.add("postgres");
  if (args.has("--tunnel-only")) selected.add("tunnel");

  return selected;
}

const onlyServices = parseOnlyServices();
const skipPortCleanup = args.has("--no-kill-ports");
const enableTunnel = (args.has("--tunnel") || onlyServices.has("tunnel")) && !args.has("--no-tunnel");
const enableStudio = args.has("--studio") || onlyServices.has("studio");

function shouldStart(serviceName) {
  if (onlyServices.size === 0) return true;

  if (serviceName === "postgres" && onlyServices.has("server") && !args.has("--no-postgres")) {
    return true;
  }

  return onlyServices.has(serviceName);
}
const proxyPort = process.env.DEV_PROXY_PORT ?? "8080";
const serverPort = process.env.SERVER_PORT ?? "4000";
const webPort = process.env.WEB_PORT ?? "3000";
const dbPort = readDatabasePort() ?? "55432";
const services = new Map();
const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m"
};
let shuttingDown = false;
let statusPrinted = false;
let tunnelUrl = null;

fs.mkdirSync(logsDir, { recursive: true });
const allLog = fs.createWriteStream(path.join(logsDir, "all.log"), { flags: "w" });

function runCommand(command, commandArgs) {
  return spawnSync(command, commandArgs, {
    cwd: rootDir,
    shell: true,
    encoding: "utf8",
    windowsHide: true
  });
}

function findPidsUsingPort(port) {
  if (process.platform !== "win32") {
    const result = runCommand("sh", ["-lc", `lsof -ti tcp:${port} 2>/dev/null || true`]);
    return [...new Set((result.stdout ?? "").split(/\s+/).map((item) => item.trim()).filter(Boolean))];
  }

  const result = runCommand("cmd.exe", ["/c", `netstat -ano | findstr :${port}`]);
  const lines = `${result.stdout ?? ""}\n${result.stderr ?? ""}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const pids = [];

  for (const line of lines) {
    if (!line.includes("LISTENING")) continue;

    const parts = line.split(/\s+/);
    const pid = parts.at(-1);

    if (pid && /^\d+$/.test(pid) && pid !== "0") {
      pids.push(pid);
    }
  }

  return [...new Set(pids)];
}

function killPid(pid) {
  if (process.platform !== "win32") {
    return runCommand("sh", ["-lc", `kill -9 ${pid} 2>/dev/null || true`]);
  }

  return runCommand("cmd.exe", ["/c", `taskkill /PID ${pid} /F`]);
}

function cleanupDevPorts() {
  if (skipPortCleanup) {
    process.stdout.write(`${colors.yellow}Skipping dev port cleanup because --no-kill-ports was passed.${colors.reset}\n`);
    return;
  }

  const portsToClean = [
    { port: webPort, label: "web" },
    { port: serverPort, label: "server" },
    { port: proxyPort, label: "proxy" }
  ].filter((item) => shouldStart(item.label));

  process.stdout.write(`${colors.dim}Cleaning stale dev ports: ${portsToClean.map((item) => item.port).join(", ")}${colors.reset}\n`);

  for (const item of portsToClean) {
    const pids = findPidsUsingPort(item.port);

    if (pids.length === 0) {
      process.stdout.write(`${colors.dim}[cleanup] port ${item.port} (${item.label}) is free.${colors.reset}\n`);
      continue;
    }

    for (const pid of pids) {
      const currentPid = String(process.pid);

      if (pid === currentPid) {
        continue;
      }

      process.stdout.write(`${colors.yellow}[cleanup] killing stale ${item.label} process on port ${item.port}, PID ${pid}.${colors.reset}\n`);
      const result = killPid(pid);

      if (result.status !== 0) {
        process.stdout.write(
          `${colors.red}[cleanup] failed to kill PID ${pid}: ${(result.stderr || result.stdout || "").trim()}${colors.reset}\n`
        );
      }
    }
  }
}


function colorFor(serviceName) {
  return {
    postgres: colors.magenta,
    server: colors.green,
    web: colors.cyan,
    proxy: colors.blue,
    tunnel: colors.yellow,
    studio: colors.magenta
  }[serviceName] ?? colors.reset;
}

function writeLine(serviceName, line) {
  const normalized = line.replace(/\r/g, "").split("\n").filter(Boolean);
  for (const entry of normalized) {
    const service = services.get(serviceName);
    if (service) {
      service.lastLines.push(entry);
      service.lastLines = service.lastLines.slice(-80);
      service.log.write(`${entry}\n`);
    }
    allLog.write(`[${serviceName}] ${entry}\n`);
    process.stdout.write(`${colorFor(serviceName)}[${serviceName}]${colors.reset} ${entry}\n`);
    checkReady(serviceName, entry);
  }
}

function createService(name, command, commandArgs, options = {}) {
  const log = fs.createWriteStream(path.join(logsDir, `${name}.log`), { flags: "w" });
  const service = {
    name,
    command,
    args: commandArgs,
    critical: Boolean(options.critical),
    ready: false,
    external: Boolean(options.external),
    child: null,
    log,
    lastLines: []
  };
  services.set(name, service);
  return service;
}

function startService(name, command, commandArgs, options = {}) {
  const service = createService(name, command, commandArgs, options);
  writeLine(name, `starting: ${command} ${commandArgs.join(" ")}`);
  const child = spawn(command, commandArgs, {
    cwd: rootDir,
    env: { ...process.env, FORCE_COLOR: "1" },
    shell: true,
    windowsHide: true
  });
  service.child = child;

  child.stdout?.on("data", (chunk) => writeLine(name, chunk.toString()));
  child.stderr?.on("data", (chunk) => writeLine(name, chunk.toString()));
  child.on("error", (error) => {
    writeLine(name, `failed to start: ${error.message}`);
    if (service.critical) stopAll(1);
  });
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    writeLine(name, `exited with ${reason}`);
    printLastLines(name);
    if (service.critical) {
      writeLine("launcher", `${name} is critical, stopping all services.`);
      stopAll(1);
    }
  });

  return service;
}

function pnpmCommand(commandArgs) {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath && npmExecPath.toLowerCase().includes("pnpm")) {
    return { command: process.execPath, args: [npmExecPath, ...commandArgs] };
  }

  const localCorepack = path.join(rootDir, ".conda", "node_modules", "corepack", "dist", "corepack.js");
  if (fs.existsSync(localCorepack)) {
    return { command: process.execPath, args: [localCorepack, "pnpm", ...commandArgs] };
  }

  return { command: "pnpm", args: commandArgs };
}

function nodeCommand(scriptPath, scriptArgs = []) {
  return { command: process.execPath, args: [scriptPath, ...scriptArgs] };
}

function readDatabasePort() {
  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) return null;
  const envText = fs.readFileSync(envPath, "utf8");
  const match = envText.match(/^DATABASE_URL=(.+)$/m);
  if (!match) return null;
  try {
    return new URL(match[1].trim()).port || null;
  } catch {
    return null;
  }
}

function findLocalPostgresBinary() {
  const candidates = process.platform === "win32"
    ? [path.join(rootDir, ".conda", "Library", "bin", "postgres.exe"), "postgres"]
    : [path.join(rootDir, ".conda", "bin", "postgres"), "postgres"];
  return candidates.find((candidate) => candidate === "postgres" || fs.existsSync(candidate)) ?? null;
}

function findLocalPgCtlBinary() {
  const candidates = process.platform === "win32"
    ? [path.join(rootDir, ".conda", "Library", "bin", "pg_ctl.exe"), "pg_ctl"]
    : [path.join(rootDir, ".conda", "bin", "pg_ctl"), "pg_ctl"];
  return candidates.find((candidate) => candidate === "pg_ctl" || fs.existsSync(candidate)) ?? null;
}

function isPostgresAlreadyRunning() {
  const pgData = path.join(rootDir, ".pgdata");
  const pgCtl = findLocalPgCtlBinary();
  if (!pgCtl || !fs.existsSync(pgData)) return false;
  const result = spawnSync(pgCtl, ["-D", pgData, "status"], { cwd: rootDir, shell: true, windowsHide: true });
  return result.status === 0;
}

function maybeStartPostgres() {
  const pgData = path.join(rootDir, ".pgdata");
  const postgres = findLocalPostgresBinary();
  if (!fs.existsSync(pgData) || !postgres) {
    createService("postgres", "skipped", [], { external: true });
    writeLine("postgres", "skipped: .pgdata or postgres binary was not found. Start your database separately if needed.");
    return;
  }

  if (isPostgresAlreadyRunning()) {
    const service = createService("postgres", "already-running", [], { external: true });
    service.ready = true;
    writeLine("postgres", `already running on port ${dbPort}; launcher will not stop it.`);
    return;
  }

  startService("postgres", postgres, ["-D", path.join(rootDir, ".pgdata"), "-p", dbPort, "-h", "127.0.0.1"], { critical: true });
}

function checkReady(serviceName, line) {
  const service = services.get(serviceName);
  if (!service || service.ready) return;
  const lower = line.toLowerCase();

  if (serviceName === "postgres" && (lower.includes("ready to accept connections") || lower.includes("database system is ready"))) {
    service.ready = true;
  }
  if (serviceName === "server" && (lower.includes("tabletop server listening") || lower.includes("listening on"))) {
    service.ready = true;
  }
  if (serviceName === "web" && (line.includes("Ready") || lower.includes("local:") || lower.includes("localhost"))) {
    service.ready = true;
  }
  if (serviceName === "proxy" && (lower.includes("proxy") || lower.includes("listening") || lower.includes("localhost"))) {
    service.ready = true;
  }
  if (serviceName === "tunnel") {
    const match = line.match(/https:\/\/[-a-z0-9]+\.trycloudflare\.com/i);
    if (match) {
      tunnelUrl = match[0];
      service.ready = true;
      process.stdout.write(`${colors.green}\nPUBLIC TUNNEL URL: ${tunnelUrl}\nSend this link to friends. No .env edit needed in local dev.\n${colors.reset}\n`);
    }
  }
  if (serviceName === "studio" && (lower.includes("prisma studio") || lower.includes("localhost"))) {
    service.ready = true;
  }

  maybePrintStatusPanel();
}

function maybePrintStatusPanel(force = false) {
  const expected = [...services.values()].filter((service) => !service.external && service.name !== "tunnel" && service.name !== "studio");
  const ready = expected.every((service) => service.ready);
  if (!force && (!ready || statusPrinted)) return;
  statusPrinted = true;
  const lines = [
    "",
    "================ DEV SERVICES ================",
    `WEB:      http://localhost:${webPort}`,
    `SERVER:   http://localhost:${serverPort}`,
    `PROXY:    http://localhost:${proxyPort}`,
    `POSTGRES: ${services.get("postgres")?.ready ? `running on 127.0.0.1:${dbPort}` : "not started by launcher"}`,
    `TUNNEL:   ${enableTunnel ? tunnelUrl ?? "starting..." : "disabled"}`,
    `STUDIO:   ${enableStudio ? "starting..." : "disabled"}`,
    `LOGS:     ${path.relative(rootDir, logsDir)}`,
    "==============================================",
    ""
  ];
  for (const line of lines) process.stdout.write(`${colors.green}${line}${colors.reset}\n`);
}

function printLastLines(serviceName) {
  const service = services.get(serviceName);
  if (!service || service.lastLines.length === 0) return;
  process.stdout.write(`${colors.red}\nLast lines from ${serviceName}:\n${colors.reset}`);
  for (const line of service.lastLines.slice(-20)) {
    process.stdout.write(`${colors.dim}${line}${colors.reset}\n`);
  }
}

function stopAll(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.stdout.write("\nStopping dev services...\n");
  for (const service of [...services.values()].reverse()) {
    if (!service.child || service.external) continue;
    try {
      if (process.platform === "win32" && service.child.pid) {
        spawnSync("cmd.exe", ["/c", `taskkill /PID ${service.child.pid} /T /F`], {
          cwd: rootDir,
          shell: true,
          windowsHide: true
        });
      } else {
        service.child.kill("SIGTERM");
      }
    } catch {
      // Process may already be gone.
    }
  }
  setTimeout(() => {
    for (const service of services.values()) {
      service.log.end();
    }
    allLog.end();
    process.stdout.write("Stopped all dev services.\n");
    process.exit(exitCode);
  }, 500);
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));

if (args.has("--help") || args.has("-h")) {
  process.stdout.write(`Usage: node scripts/dev-orchestrator.mjs [options]\n\n`);
  process.stdout.write(`Default starts local postgres/server/web/proxy without a tunnel.\n\n`);
  process.stdout.write(`Options:\n`);
  process.stdout.write(`  --tunnel                 Start Cloudflare tunnel too\n`);
  process.stdout.write(`  --no-tunnel              Force local-only mode\n`);
  process.stdout.write(`  --only web               Restart/start only frontend\n`);
  process.stdout.write(`  --only server            Restart/start backend plus postgres\n`);
  process.stdout.write(`  --only proxy             Restart/start local proxy only\n`);
  process.stdout.write(`  --only web,server        Start selected services\n`);
  process.stdout.write(`  --web-only               Shortcut for --only web\n`);
  process.stdout.write(`  --server-only            Shortcut for --only server\n`);
  process.stdout.write(`  --backend-only           Shortcut for --only server\n`);
  process.stdout.write(`  --no-kill-ports          Do not clear selected service ports first\n`);
  process.stdout.write(`  --studio                 Start Prisma Studio\n`);
  process.exit(0);
}

process.stdout.write(`${colors.green}Starting tabletop arena dev stack...${colors.reset}\n`);
process.stdout.write(`${colors.dim}Mode: ${enableTunnel ? "with tunnel" : "local only"}${onlyServices.size > 0 ? `; selected: ${[...onlyServices].join(", ")}` : ""}${colors.reset}\n`);
process.stdout.write(`${colors.dim}Logs: ${path.relative(rootDir, logsDir)}${colors.reset}\n`);

cleanupDevPorts();

if (shouldStart("postgres")) {
  maybeStartPostgres();
}

if (shouldStart("server")) {
  const server = pnpmCommand(["--filter", "@tabletop/server", "dev"]);
  startService("server", server.command, server.args, { critical: true });
}

if (shouldStart("web")) {
  const web = pnpmCommand(["--filter", "@tabletop/web", "dev"]);
  startService("web", web.command, web.args, { critical: true });
}

if (shouldStart("proxy")) {
  const proxy = nodeCommand(path.join("scripts", "dev-proxy.mjs"));
  startService("proxy", proxy.command, proxy.args, { critical: true });
}

if (enableTunnel && shouldStart("tunnel")) {
  startService("tunnel", "cloudflared", ["tunnel", "--url", `http://localhost:${proxyPort}`], { critical: false });
}

if (enableStudio && shouldStart("studio")) {
  const studio = pnpmCommand(["--filter", "@tabletop/db", "exec", "prisma", "studio", "--schema", "prisma/schema.prisma"]);
  startService("studio", studio.command, studio.args, { critical: false });
}

setTimeout(() => maybePrintStatusPanel(true), 5000);
