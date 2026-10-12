import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, clientIp, handler, rateLimit } from "@/lib/api";
import { deviceName } from "@/lib/device";
import { text } from "@/lib/validation";
import { adminAuthService } from "@/server/services/admin-auth-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const identity = text(req.body?.identity).toLowerCase();
  await rateLimit("admin-signin-ip", clientIp(req), 8, 15 * 60_000);
  // Per-account limit stops distributed guessing; it is set high enough that
  // a stranger can't keep a real administrator locked out with a few tries.
  await rateLimit("admin-signin-identity", identity, 20, 15 * 60_000);
  const result = await adminAuthService.signIn({
    identity,
    password: typeof req.body?.password === "string" ? req.body.password : "",
    device: deviceName(req.headers["user-agent"]),
  });
  res.status(200).json(result);
});
