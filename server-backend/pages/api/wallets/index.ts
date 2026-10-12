import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, rateLimit, requireUser } from "@/lib/api";
import { text } from "@/lib/validation";
import { walletService } from "@/server/services/wallet-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["GET", "POST"])) return;
  const user = await requireUser(req);

  if (req.method === "GET") {
    res.status(200).json(await walletService.list(user.id));
    return;
  }
  await rateLimit("wallet-create", user.id, 10, 60 * 60_000);
  res.status(201).json(await walletService.create(user.id, text(req.body?.name)));
});
