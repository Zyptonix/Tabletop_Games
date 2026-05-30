import type { NextFunction, Request, Response } from "express";
import { prisma } from "@tabletop/db";
import { ERROR_CODES, type AuthUser } from "@tabletop/shared";
import { readSessionFromCookie } from "../auth/session";
import { serializeUser } from "../auth/serializeUser";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authMiddleware(request: Request, response: Response, next: NextFunction) {
  const claims = readSessionFromCookie(request.headers.cookie);
  if (!claims) {
    response.status(401).json({ code: ERROR_CODES.UNAUTHORIZED, message: "Login required." });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    include: { profile: true }
  });

  if (!user) {
    response.status(401).json({ code: ERROR_CODES.UNAUTHORIZED, message: "Session user no longer exists." });
    return;
  }

  request.user = serializeUser(user);
  next();
}

export function adminMiddleware(request: Request, response: Response, next: NextFunction) {
  if (request.user?.role !== "ADMIN") {
    response.status(403).json({ code: ERROR_CODES.ADMIN_ONLY, message: "Admin privileges required." });
    return;
  }

  next();
}
