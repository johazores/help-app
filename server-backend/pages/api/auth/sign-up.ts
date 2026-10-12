import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, clientIp, handler, rateLimit } from "@/lib/api";
import { deviceName } from "@/lib/device";
import { text } from "@/lib/validation";
import { userService } from "@/server/services/user-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  // Generous per IP: many Filipino families share one carrier-NAT address.
  await rateLimit("signup-ip", clientIp(req), 30, 60 * 60_000);
  const { name, phone, pin, email } = req.body ?? {};
  const result = await userService.signUp({
    name: text(name),
    phone: text(phone),
    pin: text(pin),
    email: text(email),
    device: deviceName(req.headers["user-agent"]),
  });
  res.status(201).json(result);
});
