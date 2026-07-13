import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, rateLimit } from "@/lib/api";
import { deviceName } from "@/lib/device";
import { userService } from "@/server/services/user-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const { phone, pin } = req.body ?? {};
  rateLimit(`signin:${String(phone)}`, 8, 5 * 60_000);
  rateLimit(`signin-ip:${req.socket.remoteAddress}`, 30, 5 * 60_000);
  const result = await userService.signIn({
    phone,
    pin,
    device: deviceName(req.headers["user-agent"]),
  });
  res.status(200).json(result);
});
