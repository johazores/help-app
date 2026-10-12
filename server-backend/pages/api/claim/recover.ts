import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, clientIp, handler, rateLimit } from "@/lib/api";
import { normalizePhone } from "@/lib/validation";
import { recipientService } from "@/server/services/recipient-service";

/**
 * Public: a loved one who lost their claim link finds it again with their own
 * mobile number plus the mobile number of the person who set the money aside.
 * Requiring both numbers stops anyone who only knows one phone number from
 * listing a family's claim links.
 */
export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const phone = normalizePhone(req.body?.phone, "Please enter your mobile number.");
  const senderPhone = normalizePhone(
    req.body?.senderPhone,
    "Please enter the mobile number of the person who sent you the money.",
  );
  await rateLimit("claim-recover-ip", clientIp(req), 10, 15 * 60_000);
  await rateLimit("claim-recover-phone", phone, 5, 15 * 60_000);
  res.status(200).json(await recipientService.findClaimLinks(phone, senderPhone));
});
