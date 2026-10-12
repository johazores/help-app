import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, clientIp, handler, rateLimit } from "@/lib/api";
import { normalizePhone } from "@/lib/validation";
import { accountService } from "@/server/services/account-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const phone = normalizePhone(req.body?.phone);
  await rateLimit("forgot-phone", phone, 3, 15 * 60_000);
  await rateLimit("forgot-ip", clientIp(req), 10, 15 * 60_000);
  res.status(200).json(await accountService.forgotPin(phone));
});
