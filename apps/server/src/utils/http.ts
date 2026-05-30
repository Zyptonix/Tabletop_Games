import type { Response } from "express";
import type { ErrorCode } from "@tabletop/shared";

export function sendError(response: Response, status: number, code: ErrorCode, message: string, details?: unknown) {
  response.status(status).json({
    code,
    message,
    details
  });
}

export function levelFromXp(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 100)) + 1;
}
