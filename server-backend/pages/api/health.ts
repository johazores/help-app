import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { settingsService } from "@/server/services/settings-service";

const HORIZON_TIMEOUT_MS = 3_000;
const HORIZON_CACHE_MS = 30_000;
// A failed check is retried soon, so one slow response doesn't stick.
const HORIZON_FAILURE_CACHE_MS = 5_000;
let horizonCheck: { ok: boolean; ms: number; at: number } | null = null;

/** Pings Horizon at most every 30 seconds per instance so monitors stay cheap. */
async function horizonReachable(horizonUrl: string): Promise<{ ok: boolean; ms: number }> {
  const ttl = horizonCheck?.ok ? HORIZON_CACHE_MS : HORIZON_FAILURE_CACHE_MS;
  if (horizonCheck && Date.now() - horizonCheck.at < ttl) return horizonCheck;
  const started = Date.now();
  let ok = false;
  try {
    const res = await fetch(horizonUrl, { signal: AbortSignal.timeout(HORIZON_TIMEOUT_MS) });
    ok = res.ok;
  } catch {
    ok = false;
  }
  horizonCheck = { ok, ms: Date.now() - started, at: Date.now() };
  return horizonCheck;
}

/**
 * Health for uptime monitors and CI: the database answers a query and
 * Horizon is reachable. Responds 503 when either dependency is down.
 */
export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;

  const started = Date.now();
  let db = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch {
    db = false;
  }

  let stellar = false;
  let network: string | null = null;
  let horizonMs: number | null = null;
  try {
    const [{ horizonUrl }, explorer] = await Promise.all([settingsService.stellar(), settingsService.explorer()]);
    network = explorer.network;
    const horizon = await horizonReachable(horizonUrl);
    stellar = horizon.ok;
    horizonMs = horizon.ms;
  } catch {
    stellar = false;
  }

  const ok = db && stellar;
  res.status(ok ? 200 : 503).json({
    ok,
    db,
    stellar,
    network,
    horizonMs,
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    ms: Date.now() - started,
  });
});
