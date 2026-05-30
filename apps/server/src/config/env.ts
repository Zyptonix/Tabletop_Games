import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const configDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(configDir, "../../../..", ".env") });
dotenv.config({ override: false });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(20),
  JWT_SECRET: z.string().min(20),
  PUBLIC_APP_URL: z.string().url().default("http://localhost:8080"),
  SOCKET_PATH: z.string().default("/socket.io"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SERVER_PORT: z.coerce.number().int().positive().default(4000)
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  JWT_SECRET: process.env.JWT_SECRET,
  PUBLIC_APP_URL: process.env.PUBLIC_APP_URL,
  SOCKET_PATH: process.env.SOCKET_PATH,
  NODE_ENV: process.env.NODE_ENV,
  SERVER_PORT: process.env.SERVER_PORT
});

export const corsOrigins = [
  env.PUBLIC_APP_URL,
  "http://localhost:3000",
  "http://localhost:8080",
  "http://127.0.0.1:8080"
];
