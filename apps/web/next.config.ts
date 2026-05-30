import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const configDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(configDir, "../..", ".env") });

const nextConfig: NextConfig = {
  transpilePackages: ["@tabletop/shared", "@tabletop/game-core"],
  reactStrictMode: true
};

export default nextConfig;
