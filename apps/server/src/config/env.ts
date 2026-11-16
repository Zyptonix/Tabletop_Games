import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const configDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({
  path: path.resolve(configDir, "../../../..", ".env"),
  override: process.env.NODE_ENV !== "production"
});
dotenv.config({ override: false });

const nodeEnvSchema = z.enum(["development", "test", "production"]);
const rawNodeEnv = cleanEnvValue(process.env.NODE_ENV) ?? "development";
const nodeEnv = nodeEnvSchema.safeParse(rawNodeEnv).success ? (rawNodeEnv as "development" | "test" | "production") : "development";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(20),
  JWT_SECRET: z.string().min(20),
  PUBLIC_APP_URL: z.string().url(),
  SOCKET_PATH: z.string().default("/socket.io"),
  NODE_ENV: nodeEnvSchema.default("development"),
  SERVER_PORT: z.coerce.number().int().positive().default(4000),
  ENABLE_UNO_DEBUG_PANEL: z.enum(["true", "false"]).optional(),
  DEPLOYED_GAMES: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional()
});

export const env = envSchema.parse({
  DATABASE_URL: cleanEnvValue(process.env.DATABASE_URL),
  SESSION_SECRET: cleanEnvValue(process.env.SESSION_SECRET),
  JWT_SECRET: cleanEnvValue(process.env.JWT_SECRET),
  PUBLIC_APP_URL: resolvePublicAppUrl(nodeEnv),
  SOCKET_PATH: cleanEnvValue(process.env.SOCKET_PATH),
  NODE_ENV: nodeEnv,
  SERVER_PORT: cleanEnvValue(process.env.PORT ?? process.env.SERVER_PORT),
  ENABLE_UNO_DEBUG_PANEL: cleanEnvValue(process.env.ENABLE_UNO_DEBUG_PANEL ?? process.env.NEXT_PUBLIC_ENABLE_UNO_DEBUG_PANEL),
  DEPLOYED_GAMES: cleanEnvValue(process.env.DEPLOYED_GAMES ?? process.env.NEXT_PUBLIC_DEPLOYED_GAMES),
  ALLOWED_ORIGINS: cleanEnvValue(process.env.ALLOWED_ORIGINS)
});

const extraOrigins = env.ALLOWED_ORIGINS
  ? env.ALLOWED_ORIGINS.split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean)
  : [];

export const corsOrigins = Array.from(
  new Set([
    env.PUBLIC_APP_URL.replace(/\/$/, ""),
    "http://localhost:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:3000",
    ...extraOrigins
  ])
);

export function corsOriginDelegate(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void): void {
  callback(null, isAllowedCorsOrigin(origin));
}

function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  const normalized = origin.replace(/\/$/, "");

  if (corsOrigins.includes(normalized)) {
    return true;
  }

  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    // Allow any Vercel deployment (production or preview branches)
    if (hostname.endsWith(".vercel.app")) {
      return true;
    }
    // Allow Render internal / preview hosts
    if (hostname.endsWith(".onrender.com")) {
      return true;
    }
    // Allow Cloudflare quick tunnels in non-production
    if (env.NODE_ENV !== "production" && hostname.endsWith(".trycloudflare.com")) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function cleanEnvValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function resolvePublicAppUrl(currentEnv: "development" | "test" | "production"): string {
  const fallback = "http://localhost:8080";
  const value = cleanEnvValue(process.env.PUBLIC_APP_URL);

  if (!value) {
    return fallback;
  }

  const parsed = z.string().url().safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  const message = `Invalid PUBLIC_APP_URL "${value}".`;
  if (currentEnv === "production") {
    throw new Error(`${message} Set a valid absolute URL before starting the server.`);
  }

  console.warn(`[env] ${message} Falling back to ${fallback} for local development.`);
  return fallback;
}

export const unoDebugScenariosEnabled = env.NODE_ENV !== "production" || env.ENABLE_UNO_DEBUG_PANEL === "true";
