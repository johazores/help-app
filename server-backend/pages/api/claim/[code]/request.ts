import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, rateLimit } from "@/lib/api";
import { safetyNetService } from "@/server/services/safety-net-service";

// Family asks for the money early. Public, guarded by the claim code + rate limit.
export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const code = String(req.query.code);
  rateLimit(`early-request:${code}`, 3, 60 * 60_000);
  res.status(200).json(await safetyNetService.requestEarly(code));
});
