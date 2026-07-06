import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A tiny, dependency-free HS256 JWT implementation.
 *
 * Tokens are stateless and travel in the Authorization header, which works the
 * same on mobile web, installed PWAs, and native wrappers — no cookie quirks.
 */

interface TokenPayload {
  sub: string; // user id
  name: string;
  iat: number;
  exp: number;
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

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

export function issueToken(user: { id: string; name: string }): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: user.id,
    name: user.name,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const body = base64url(JSON.stringify(payload));
  const signature = sign(`${header}.${body}`);
  return `${header}.${body}.${signature}`;
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
    return payload;
  } catch {
    return null;
  }
}
