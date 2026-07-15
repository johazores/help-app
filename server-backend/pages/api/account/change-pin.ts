import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, rateLimit, requireUser } from "@/lib/api";
import { accountService } from "@/server/services/account-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const user = await requireUser(req);
  rateLimit(`changepin:${user.id}`, 5, 15 * 60_000);
  const { currentPin, newPin } = req.body ?? {};
  res
    .status(200)
    .json(await accountService.changePin(user.id, String(currentPin ?? ""), String(newPin ?? ""), user.sessionId));
});
