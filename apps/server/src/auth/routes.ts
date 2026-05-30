import { Router } from "express";
import { prisma } from "@tabletop/db";
import { createUserSchema, ERROR_CODES, loginSchema } from "@tabletop/shared";
import { hashPassword, verifyPassword } from "./password";
import { clearSessionCookie, setSessionCookie, signSession } from "./session";
import { serializeUser } from "./serializeUser";
import { adminMiddleware, authMiddleware } from "../middleware/authMiddleware";
import { sendError } from "../utils/http";

export const authRouter = Router();

authRouter.post("/auth/login", async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    sendError(response, 400, ERROR_CODES.INVALID_PAYLOAD, "Invalid login payload.", parsed.error.flatten());
    return;
  }

  const user = await prisma.user.findUnique({
    where: { username: parsed.data.username },
    include: { profile: true }
  });

  if (!user || !(await verifyPassword(user.passwordHash, parsed.data.password))) {
    sendError(response, 401, ERROR_CODES.UNAUTHORIZED, "Invalid username or password.");
    return;
  }

  const authUser = serializeUser(user);
  const token = signSession({
    sub: user.id,
    username: user.username,
    role: user.role
  });

  setSessionCookie(response, token);
  response.json({ user: authUser });
});

authRouter.post("/auth/logout", (_request, response) => {
  clearSessionCookie(response);
  response.json({ ok: true });
});

authRouter.get("/auth/me", authMiddleware, (request, response) => {
  response.json({ user: request.user });
});

authRouter.post("/auth/users", authMiddleware, adminMiddleware, async (request, response) => {
  const parsed = createUserSchema.safeParse(request.body);
  if (!parsed.success) {
    sendError(response, 400, ERROR_CODES.INVALID_PAYLOAD, "Invalid user payload.", parsed.error.flatten());
    return;
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { username: parsed.data.username },
        ...(parsed.data.email ? [{ email: parsed.data.email }] : [])
      ]
    }
  });

  if (existing) {
    sendError(response, 409, ERROR_CODES.USERNAME_TAKEN, "Username or email is already in use.");
    return;
  }

  const user = await prisma.user.create({
    data: {
      username: parsed.data.username,
      email: parsed.data.email ?? null,
      role: parsed.data.role,
      passwordHash: await hashPassword(parsed.data.password),
      profile: {
        create: {
          displayName: parsed.data.displayName
        }
      }
    },
    include: { profile: true }
  });

  response.status(201).json({ user: serializeUser(user) });
});
