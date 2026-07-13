import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { settingsService } from "@/server/services/settings-service";

/** Lightweight health check for uptime monitoring and CI smoke tests. */
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
  try {
    const cfg = await settingsService.stellar();
    stellar = Boolean(cfg.horizonUrl);
  } catch {
    stellar = false;
  }

  const ok = db && stellar;
  res.status(ok ? 200 : 503).json({
    ok,
    db,
    stellar,
    ms: Date.now() - started,
  });
});
