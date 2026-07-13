import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, rateLimit, requireUser } from "@/lib/api";
import { accountService } from "@/server/services/account-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const user = await requireUser(req);
  rateLimit(`emailconfirm:${user.id}`, 10, 15 * 60_000);
  const { code } = req.body ?? {};
  res.status(200).json(await accountService.confirmEmail(user.id, String(code ?? "")));
});
