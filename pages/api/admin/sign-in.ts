import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, rateLimit } from "@/lib/api";
import { deviceName } from "@/lib/device";
import { adminAuthService } from "@/server/services/admin-auth-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const { identity, password } = req.body ?? {};
  rateLimit(`admin-signin:${req.socket.remoteAddress}`, 8, 5 * 60_000);
  const result = await adminAuthService.signIn({
    identity: String(identity ?? ""),
    password: String(password ?? ""),
    device: deviceName(req.headers["user-agent"]),
  });
  res.status(200).json(result);
});
