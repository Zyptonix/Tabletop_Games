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

export function setSessionCookie(response: Response, token: string): void {
  response.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000
  });
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/"
  });
}
