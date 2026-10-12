import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, clientIp, handler, rateLimit } from "@/lib/api";
import { normalizePhone, text } from "@/lib/validation";
import { accountService } from "@/server/services/account-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const phone = normalizePhone(req.body?.phone);
  await rateLimit("reset-phone", phone, 8, 15 * 60_000);
  await rateLimit("reset-ip", clientIp(req), 20, 15 * 60_000);
  res.status(200).json(await accountService.resetPin(phone, text(req.body?.code), text(req.body?.newPin)));
});
