import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, requireUser } from "@/lib/api";
import { paluwaganService } from "@/server/services/paluwagan-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const user = await requireUser(req);
  const { pin } = req.body ?? {};
  res.status(200).json(await paluwaganService.start(user.id, String(req.query.id), String(pin ?? "")));
});
