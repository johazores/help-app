import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, rateLimit } from "@/lib/api";
import { recipientService } from "@/server/services/recipient-service";

/** Public: loved ones who lost their claim link can look it up by mobile number. */
export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const { phone } = req.body ?? {};
  rateLimit(`claim-recover:${String(phone)}`, 5, 15 * 60_000);
  res.status(200).json(await recipientService.findClaimLinksByPhone(String(phone ?? "")));
});
