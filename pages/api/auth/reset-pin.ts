import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, rateLimit } from "@/lib/api";
import { accountService } from "@/server/services/account-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const { phone, code, newPin } = req.body ?? {};
  rateLimit(`reset:${String(phone)}`, 8, 15 * 60_000);
  res.status(200).json(await accountService.resetPin(String(phone ?? ""), String(code ?? ""), String(newPin ?? "")));
});
