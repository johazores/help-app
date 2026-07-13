import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const apiOrigin = (process.env.API_URL ?? "http://localhost:3001").replace(/\/$/, "");

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const destination = new URL(`${pathname}${search}`, apiOrigin);
  return NextResponse.rewrite(destination);
}

export const config = {
  matcher: "/api/:path*",
};
