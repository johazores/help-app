import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, clientIp, handler, rateLimit } from "@/lib/api";
import { safetyNetService } from "@/server/services/safety-net-service";

// Recipient-facing: no login required, guarded by the unique claim code.
export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["GET", "POST"])) return;
  const code = String(req.query.code);

  if (req.method === "GET") {
    await rateLimit("claim-view-ip", clientIp(req), 120, 15 * 60_000);
    res.status(200).json(await safetyNetService.lookupByCode(code));
    return;
  }
  await rateLimit("claim-code", code, 5, 15 * 60_000);
  await rateLimit("claim-ip", clientIp(req), 30, 15 * 60_000);
  res.status(200).json(await safetyNetService.claimByCode(code));
});
