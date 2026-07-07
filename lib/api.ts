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
  role: "USER" | "ROOT";
}

/** Reads and verifies the bearer token, returning the current user. */
export async function requireUser(req: NextApiRequest): Promise<AuthedUser> {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = token ? verifyToken(token) : null;
  if (!payload) throw new ApiError(401, "Please sign in again.");

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new ApiError(401, "Please sign in again.");
  return { id: user.id, name: user.name, role: user.role };
}

/** Like requireUser, but only allows a ROOT (admin) account. */
export async function requireRoot(req: NextApiRequest): Promise<AuthedUser> {
  const user = await requireUser(req);
  if (user.role !== "ROOT") throw new ApiError(403, "You don't have access to this area.");
  return user;
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
