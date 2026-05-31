import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const configDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(configDir, "../../../..", ".env") });
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
  SERVER_PORT: z.coerce.number().int().positive().default(4000)
});

export const env = envSchema.parse({
  DATABASE_URL: cleanEnvValue(process.env.DATABASE_URL),
  SESSION_SECRET: cleanEnvValue(process.env.SESSION_SECRET),
  JWT_SECRET: cleanEnvValue(process.env.JWT_SECRET),
  PUBLIC_APP_URL: resolvePublicAppUrl(nodeEnv),
  SOCKET_PATH: cleanEnvValue(process.env.SOCKET_PATH),
  NODE_ENV: nodeEnv,
  SERVER_PORT: cleanEnvValue(process.env.SERVER_PORT)
});

export const corsOrigins = [
  env.PUBLIC_APP_URL,
  "http://localhost:3000",
  "http://localhost:8080",
  "http://127.0.0.1:8080"
];

export function corsOriginDelegate(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void): void {
  callback(null, isAllowedCorsOrigin(origin));
}

function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  if (corsOrigins.includes(origin)) {
    return true;
  }

  if (env.NODE_ENV !== "production") {
    try {
      return new URL(origin).hostname.endsWith(".trycloudflare.com");
    } catch {
      return false;
    }
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
