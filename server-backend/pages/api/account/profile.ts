import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, requireUser } from "@/lib/api";
import { accountService } from "@/server/services/account-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["PATCH"])) return;
  const user = await requireUser(req);
  const { name } = req.body ?? {};
  res.status(200).json(await accountService.updateName(user.id, String(name ?? "")));
});
