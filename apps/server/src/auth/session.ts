import cookie from "cookie";
import jwt from "jsonwebtoken";
import type { Response } from "express";
import type { SessionClaims } from "@tabletop/shared";
import { env } from "../config/env";

export const SESSION_COOKIE_NAME = "tabletop_session";
const SESSION_DAYS = 30;

export function signSession(claims: SessionClaims): string {
  return jwt.sign(claims, env.JWT_SECRET, {
    expiresIn: `${SESSION_DAYS}d`,
    issuer: "tabletop-arena"
  });
}

export function verifySession(token: string): SessionClaims | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: "tabletop-arena"
    });

    if (typeof decoded === "object" && typeof decoded.sub === "string") {
      return decoded as SessionClaims;
    }
  } catch {
    return null;
  }

  return null;
}

export function readSessionFromCookie(cookieHeader: string | undefined): SessionClaims | null {
  if (!cookieHeader) {
    return null;
  }

  const parsed = cookie.parse(cookieHeader);
  const token = parsed[SESSION_COOKIE_NAME];
  return token ? verifySession(token) : null;
}

export function readSessionFromHeader(authHeader: string | undefined): SessionClaims | null {
  if (!authHeader) {
    return null;
  }
  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0]?.toLowerCase() === "bearer" && parts[1]) {
    return verifySession(parts[1]);
  }
  return null;
}

export function extractSessionClaims(
  authHeader: string | undefined,
  cookieHeader: string | undefined
): SessionClaims | null {
  return readSessionFromHeader(authHeader) ?? readSessionFromCookie(cookieHeader);
}

export function setSessionCookie(response: Response, token: string): void {
  const isSecureOrigin = env.PUBLIC_APP_URL.startsWith("https://");

  response.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isSecureOrigin ? "none" : "lax",
    secure: isSecureOrigin,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000
  });
}

export function clearSessionCookie(response: Response): void {
  const isSecureOrigin = env.PUBLIC_APP_URL.startsWith("https://");

  response.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: isSecureOrigin ? "none" : "lax",
    secure: isSecureOrigin,
    path: "/"
  });
}
