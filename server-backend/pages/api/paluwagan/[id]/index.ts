import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, requireUser } from "@/lib/api";
import { paluwaganService } from "@/server/services/paluwagan-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  const user = await requireUser(req);
  res.status(200).json(await paluwaganService.detail(user.id, String(req.query.id)));
});
