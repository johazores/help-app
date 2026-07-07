import type { NextApiRequest, NextApiResponse } from "next";
import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

/** Thrown by services/handlers to produce a clean HTTP error. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface AuthedUser {
  id: string;
  name: string;
  sessionId: string;
}

export interface AuthedAdmin {
  id: string;
  name: string;
  username: string;
  sessionId: string;
}

const SEEN_THROTTLE_MS = 5 * 60 * 1000;

function bearer(req: NextApiRequest): string {
  const header = req.headers.authorization ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

/** Verifies the token AND its live session; updates last-seen. */
export async function requireUser(req: NextApiRequest): Promise<AuthedUser> {
  const payload = verifyToken(bearer(req));
  if (!payload || payload.scope !== "user") throw new ApiError(401, "Please sign in again.");

  const session = await prisma.userSession.findUnique({
    where: { id: payload.sid },
    include: { user: { select: { id: true, name: true } } },
  });
  if (
    !session ||
    session.userId !== payload.sub ||
    session.revokedAt ||
    session.expiresAt.getTime() < Date.now()
  ) {
    throw new ApiError(401, "Please sign in again.");
  }
  if (Date.now() - session.lastSeenAt.getTime() > SEEN_THROTTLE_MS) {
    await prisma.userSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });
  }
  return { id: session.user.id, name: session.user.name, sessionId: session.id };
}

/** Same, for the fully separate admin identity. */
export async function requireAdmin(req: NextApiRequest): Promise<AuthedAdmin> {
  const payload = verifyToken(bearer(req));
  if (!payload || payload.scope !== "admin") throw new ApiError(401, "Please sign in again.");

  const session = await prisma.adminSession.findUnique({
    where: { id: payload.sid },
    include: { admin: { select: { id: true, name: true, username: true } } },
  });
  if (
    !session ||
    session.adminId !== payload.sub ||
    session.revokedAt ||
    session.expiresAt.getTime() < Date.now()
  ) {
    throw new ApiError(401, "Please sign in again.");
  }
  if (Date.now() - session.lastSeenAt.getTime() > SEEN_THROTTLE_MS) {
    await prisma.adminSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });
  }
  return {
    id: session.admin.id,
    name: session.admin.name,
    username: session.admin.username,
    sessionId: session.id,
  };
}

/** Restricts a handler to specific HTTP methods. */
export function allowMethods(
  req: NextApiRequest,
  res: NextApiResponse,
  methods: string[],
): boolean {
  if (!methods.includes(req.method ?? "")) {
    res.setHeader("Allow", methods);
    res.status(405).json({ error: `Method ${req.method} not allowed.` });
    return false;
  }
  return true;
}

/** Wraps a handler so thrown ApiErrors (and unexpected errors) become JSON. */
export function handler(
  fn: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof ApiError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      console.error("Unhandled API error:", err);
      res.status(500).json({ error: "Something went wrong on our side. Please try again." });
    }
  };
}

// ---- Minimal in-memory rate limiter for auth endpoints ----------------------
// Per-process; enough to blunt brute force on a single instance. Documented in
// PRODUCTION.md as something to move to Redis for multi-instance deployments.
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number): void {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    throw new ApiError(429, "Too many attempts. Please wait a moment and try again.");
  }
  hits.push(now);
  buckets.set(key, hits);
}
