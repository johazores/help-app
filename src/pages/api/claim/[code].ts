import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler } from "@/lib/api";
import { safetyNetService } from "@/server/services/safety-net-service";

// Recipient-facing: no login required, guarded by the unique claim code.
export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["GET", "POST"])) return;
  const code = String(req.query.code);

  if (req.method === "GET") {
    res.status(200).json(await safetyNetService.lookupByCode(code));
    return;
  }
  res.status(200).json(await safetyNetService.claimByCode(code));
});
