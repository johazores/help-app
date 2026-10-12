import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { Prisma } from "@prisma/client";
import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { log } from "@/lib/log";

/** Thrown by services/handlers to produce a clean HTTP error. */
export class ApiError extends Error {
  status: number;
  retryAfterSeconds?: number;
  constructor(status: number, message: string, options: { retryAfterSeconds?: number } = {}) {
    super(message);
    this.status = status;
    this.retryAfterSeconds = options.retryAfterSeconds;
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

const CORS_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const CORS_HEADERS = "Content-Type, Authorization, X-Request-Id";

/** Comma-separated browser origins allowed to call the API directly (optional). */
function allowedCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN ?? process.env.CLIENT_ORIGIN ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Optional CORS for direct browser → API calls (separate host without proxy).
 * Default web app uses client `proxy.ts` + relative `/api/*` — same-origin, no CORS.
 * Returns false when the request is fully handled (OPTIONS preflight).
 */
function applyCors(req: NextApiRequest, res: NextApiResponse): boolean {
  const origin = req.headers.origin;
  const allowed = allowedCorsOrigins();

  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", CORS_METHODS);
    res.setHeader("Access-Control-Allow-Headers", CORS_HEADERS);
    res.setHeader("Access-Control-Max-Age", "86400");
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    res.status(origin && allowed.includes(origin) ? 204 : 403).end();
    return false;
  }

  return true;
}

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

/** Constant-time string comparison for shared secrets. */
export function secretsMatch(provided: unknown, expected: string): boolean {
  if (typeof provided !== "string" || !expected) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function headerValue(req: NextApiRequest, name: string): string {
  const value = req.headers[name];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/**
 * The end user's IP address, used only for rate limiting.
 *
 * - Behind the Sagip web proxy, the proxy forwards the visitor IP together
 *   with PROXY_SHARED_SECRET; only then is the forwarded value trusted.
 * - On Vercel, the platform overwrites X-Forwarded-For, so its first hop is
 *   the real caller.
 * - Otherwise the socket address is used; a spoofable header is never trusted.
 */
export function clientIp(req: NextApiRequest): string {
  const sharedSecret = process.env.PROXY_SHARED_SECRET;
  if (sharedSecret && secretsMatch(headerValue(req, "x-sagip-proxy-secret"), sharedSecret)) {
    const forwarded = headerValue(req, "x-sagip-client-ip");
    if (forwarded) return forwarded;
  }
  if (process.env.VERCEL === "1") {
    const first = headerValue(req, "x-forwarded-for").split(",")[0]?.trim();
    if (first) return first;
  }
  return req.socket.remoteAddress ?? "unknown";
}

function prismaErrorToApiError(err: unknown): ApiError | null {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return null;
  if (err.code === "P2002") return new ApiError(409, "That already exists. Please refresh and try again.");
  if (err.code === "P2025") return new ApiError(404, "We couldn't find that. Please refresh and try again.");
  return null;
}

/** Wraps a handler so thrown ApiErrors (and unexpected errors) become JSON. */
export function handler(
  fn: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const incomingId = headerValue(req, "x-request-id");
    const requestId = /^[\w-]{8,64}$/.test(incomingId) ? incomingId : randomUUID();
    res.setHeader("X-Request-Id", requestId);
    // API responses can carry balances, claim links, or recovery keys:
    // never let a browser, proxy, or CDN keep a copy.
    res.setHeader("Cache-Control", "no-store");

    if (!applyCors(req, res)) return;
    try {
      await fn(req, res);
    } catch (err) {
      const known = err instanceof ApiError ? err : prismaErrorToApiError(err);
      if (known) {
        if (known.retryAfterSeconds) res.setHeader("Retry-After", String(known.retryAfterSeconds));
        if (known.status >= 500) {
          log("error", "api.error", { requestId, method: req.method, path: req.url, status: known.status, error: err });
        }
        res.status(known.status).json({ error: known.message, requestId });
        return;
      }
      log("error", "api.unhandled", { requestId, method: req.method, path: req.url, error: err });
      res.status(500).json({ error: "Something went wrong on our side. Please try again.", requestId });
    }
  };
}

// ---- Rate limiting -----------------------------------------------------------
// Fixed-window counters stored in PostgreSQL, so limits hold across every
// serverless instance and survive cold starts. Keys are hashed: phone numbers
// and IPs used as limiter keys are never stored in readable form.

function bucketKey(scope: string, identity: string): string {
  const digest = createHash("sha256").update(identity).digest("base64url");
  return `${scope}:${digest}`;
}

/**
 * Counts one attempt for `scope` + `identity` and throws 429 once more than
 * `max` attempts land inside `windowMs`.
 */
export async function rateLimit(
  scope: string,
  identity: string,
  max: number,
  windowMs: number,
): Promise<void> {
  const key = bucketKey(scope, identity);
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  // "resetAt" is a UTC timestamp without time zone (as Prisma stores it), so
  // parameters are converted to UTC explicitly, whatever the session TimeZone.
  const rows = await prisma.$queryRaw<{ hits: number; resetAt: Date }[]>`
    INSERT INTO "RateLimitBucket" ("key", "hits", "resetAt")
    VALUES (${key}, 1, ${resetAt}::timestamptz AT TIME ZONE 'UTC')
    ON CONFLICT ("key") DO UPDATE SET
      "hits" = CASE WHEN "RateLimitBucket"."resetAt" <= ${now}::timestamptz AT TIME ZONE 'UTC'
        THEN 1 ELSE "RateLimitBucket"."hits" + 1 END,
      "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= ${now}::timestamptz AT TIME ZONE 'UTC'
        THEN ${resetAt}::timestamptz AT TIME ZONE 'UTC' ELSE "RateLimitBucket"."resetAt" END
    RETURNING "hits", "resetAt"
  `;
  // Keep the table small even when the hourly cron isn't configured.
  if (Math.random() < 0.005) {
    pruneRateLimits().catch((error) => log("warn", "rate_limit.prune_failed", { error }));
  }
  const bucket = rows[0];
  if (bucket && bucket.hits > max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt.getTime() - now.getTime()) / 1000));
    throw new ApiError(429, "Too many attempts. Please wait a moment and try again.", { retryAfterSeconds });
  }
}

/** Removes counters whose window ended more than a day ago. */
export async function pruneRateLimits(): Promise<number> {
  const { count } = await prisma.rateLimitBucket.deleteMany({
    where: { resetAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  return count;
}
