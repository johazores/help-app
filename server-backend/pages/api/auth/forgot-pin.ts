import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, rateLimit } from "@/lib/api";
import { accountService } from "@/server/services/account-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const { phone } = req.body ?? {};
  rateLimit(`forgot:${String(phone)}`, 3, 15 * 60_000);
  res.status(200).json(await accountService.forgotPin(String(phone ?? "")));
});
