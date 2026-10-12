import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, clientIp, handler, rateLimit } from "@/lib/api";
import { safetyNetService } from "@/server/services/safety-net-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const code = String(req.query.code);
  await rateLimit("backup-claim-code", code, 5, 15 * 60_000);
  await rateLimit("backup-claim-ip", clientIp(req), 30, 15 * 60_000);
  res.status(200).json(await safetyNetService.backupClaimByCode(code));
});
