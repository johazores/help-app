import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Dependency-free HS256 JWT. Tokens are session-bound: they carry a session id
 * (sid) and a scope, and are only valid while that session row is alive. This
 * gives instant revocation and multi-device management without an auth library.
 */

export type TokenScope = "user" | "admin";

export interface TokenPayload {
  sub: string; // user or admin id
  sid: string; // session id
  scope: TokenScope;
  iat: number;
  exp: number;
}

export const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function secret(): string {
  const value = process.env.AUTH_TOKEN_SECRET;
  if (!value) throw new Error("AUTH_TOKEN_SECRET is not set. See .env.example.");
  return value;
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function issueToken(subject: string, sessionId: string, scope: TokenScope): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: subject,
    sid: sessionId,
    scope,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const body = base64url(JSON.stringify(payload));
  return `${header}.${body}.${sign(`${header}.${body}`)}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;

  const expected = sign(`${header}.${body}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (payload.scope !== "user" && payload.scope !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
}
