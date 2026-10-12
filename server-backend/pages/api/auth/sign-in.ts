import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, clientIp, handler, rateLimit } from "@/lib/api";
import { deviceName } from "@/lib/device";
import { normalizePhone, text } from "@/lib/validation";
import { userService } from "@/server/services/user-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const phone = normalizePhone(req.body?.phone);
  // Keyed on the normalized number so "+63 917…", "0917…" and "917…" share one budget.
  await rateLimit("signin-phone", phone, 8, 15 * 60_000);
  await rateLimit("signin-ip", clientIp(req), 30, 15 * 60_000);
  const result = await userService.signIn({
    phone,
    pin: text(req.body?.pin),
    device: deviceName(req.headers["user-agent"]),
  });
  res.status(200).json(result);
});
