import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, rateLimit, requireUser } from "@/lib/api";
import { walletService } from "@/server/services/wallet-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const user = await requireUser(req);
  rateLimit(`wallet-reveal:${user.id}`, 5, 15 * 60_000);
  const { pin } = req.body ?? {};
  res.status(200).json(await walletService.reveal(user.id, String(req.query.id), String(pin ?? "")));
});
