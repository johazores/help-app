import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, rateLimit } from "@/lib/api";
import { deviceName } from "@/lib/device";
import { userService } from "@/server/services/user-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  rateLimit(`signup:${req.socket.remoteAddress}`, 10, 60_000);
  const { name, phone, pin, email } = req.body ?? {};
  const result = await userService.signUp({
    name,
    phone,
    pin,
    email,
    device: deviceName(req.headers["user-agent"]),
  });
  res.status(201).json(result);
});
