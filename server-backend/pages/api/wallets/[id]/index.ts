import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, requireUser } from "@/lib/api";
import { walletService } from "@/server/services/wallet-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["PATCH"])) return;
  const user = await requireUser(req);
  const { name } = req.body ?? {};
  res.status(200).json(await walletService.rename(user.id, String(req.query.id), String(name ?? "")));
});
