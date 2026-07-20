import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, rateLimit } from "@/lib/api";
import { safetyNetService } from "@/server/services/safety-net-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const code = String(req.query.code);
  rateLimit(`receiver-check-in:${code}`, 5, 15 * 60_000);
  rateLimit(`receiver-check-in-ip:${req.socket.remoteAddress}`, 30, 15 * 60_000);
  res.status(200).json(await safetyNetService.receiverCheckInByCode(code));
});
