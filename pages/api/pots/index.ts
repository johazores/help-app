import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, requireUser } from "@/lib/api";
import { potService } from "@/server/services/pot-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["GET", "POST"])) return;
  const user = await requireUser(req);
  if (req.method === "GET") {
    res.status(200).json(await potService.list(user.id));
    return;
  }
  const { name, target } = req.body ?? {};
  res.status(201).json(await potService.create(user.id, String(name ?? ""), String(target ?? "")));
});
