import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const configDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(configDir, "../..", ".env") });

const nextConfig: NextConfig = {
  transpilePackages: ["@tabletop/shared", "@tabletop/game-core"],
  reactStrictMode: true,
  async rewrites() {
    const backendUrl =
      process.env.SERVER_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_SERVER_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL;

    if (!backendUrl || backendUrl.startsWith("/")) {
      return [];
    }

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl.replace(/\/$/, "")}/:path*`
      }
    ];
  }
};

export default nextConfig;
