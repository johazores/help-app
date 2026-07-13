import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, rateLimit, requireUser } from "@/lib/api";
import { walletService } from "@/server/services/wallet-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const user = await requireUser(req);
  rateLimit(`wallet-import:${user.id}`, 10, 15 * 60_000);
  const { secretKey, name } = req.body ?? {};
  res.status(201).json(await walletService.import(user.id, String(secretKey ?? ""), name));
});
