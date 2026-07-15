import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, rateLimit, requireUser } from "@/lib/api";
import { accountService } from "@/server/services/account-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const user = await requireUser(req);
  rateLimit(`emailreq:${user.id}`, 4, 15 * 60_000);
  const { email } = req.body ?? {};
  res.status(200).json(await accountService.requestEmailChange(user.id, String(email ?? "")));
});
