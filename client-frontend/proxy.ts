import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const apiOrigin = (process.env.API_URL ?? "http://localhost:8001").replace(/\/$/, "");
const proxySecret = process.env.PROXY_SHARED_SECRET;

/**
 * The visitor's IP as seen by the hosting platform. Vercel replaces
 * X-Forwarded-For with the real client address, so its first entry is
 * trustworthy. Elsewhere a reverse proxy appends the address it saw, so only
 * the last entry can be trusted; earlier entries may be forged by the client.
 */
function visitorIp(request: NextRequest): string | null {
  const hops = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((hop) => hop.trim())
    .filter(Boolean);
  const hop = process.env.VERCEL === "1" ? hops[0] : hops[hops.length - 1];
  return hop || request.headers.get("x-real-ip");
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const destination = new URL(`${pathname}${search}`, apiOrigin);

  // Every visitor reaches the API through this proxy, so the API would see a
  // single caller IP. Forward the real one, signed with a shared secret the API
  // checks before trusting it for per-visitor rate limits.
  const headers = new Headers(request.headers);
  headers.delete("x-sagip-proxy-secret");
  headers.delete("x-sagip-client-ip");
  const ip = visitorIp(request);
  if (proxySecret && ip) {
    headers.set("x-sagip-proxy-secret", proxySecret);
    headers.set("x-sagip-client-ip", ip);
  }

  return NextResponse.rewrite(destination, { request: { headers } });
}

export const config = {
  matcher: "/api/:path*",
};
