import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, requireUser } from "@/lib/api";
import { accountService } from "@/server/services/account-service";

export const config = { api: { bodyParser: { sizeLimit: "400kb" } } };

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["PATCH"])) return;
  const user = await requireUser(req);
  const { avatar } = req.body ?? {};
  res.status(200).json(await accountService.updateAvatar(user.id, avatar ?? null));
});
