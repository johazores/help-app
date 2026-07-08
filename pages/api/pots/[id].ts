import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, requireUser } from "@/lib/api";
import { potService } from "@/server/services/pot-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST", "DELETE"])) return;
  const user = await requireUser(req);
  const id = String(req.query.id);
  if (req.method === "POST") {
    const { amount } = req.body ?? {};
    res.status(200).json(await potService.addTo(user.id, id, String(amount ?? "")));
    return;
  }
  res.status(200).json(await potService.remove(user.id, id));
});
