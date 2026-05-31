import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { authRouter } from "./auth/routes";
import { corsOriginDelegate } from "./config/env";
import { createAdminRouter } from "./admin/routes";
import { createRoomsRouter } from "./rooms/routes";
import type { RoomManager } from "./rooms/RoomManager";
import { createServicesRouter } from "./services/routes";

export function createApp(manager: RoomManager) {
  const app = express();

  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );
  app.use(
    cors({
      origin: corsOriginDelegate,
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 240,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  app.get("/health", (_request, response) => {
    response.json({ ok: true, service: "tabletop-server" });
  });

  app.use(authRouter);
  app.use(createRoomsRouter(manager));
  app.use(createServicesRouter());
  app.use(createAdminRouter(manager));

  return app;
}
