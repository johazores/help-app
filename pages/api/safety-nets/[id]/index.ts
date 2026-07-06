import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, requireUser } from "@/lib/api";
import { safetyNetService } from "@/server/services/safety-net-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  const user = await requireUser(req);
  const id = String(req.query.id);
  res.status(200).json(await safetyNetService.detail(user.id, id));
});
