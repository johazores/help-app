import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, requireUser } from "@/lib/api";
import { safetyNetService } from "@/server/services/safety-net-service";

// Owner approves (POST) or dismisses (DELETE) a family request to open early.
export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST", "DELETE"])) return;
  const user = await requireUser(req);
  const id = String(req.query.id);
  if (req.method === "POST") {
    res.status(200).json(await safetyNetService.approveEarly(user.id, id));
    return;
  }
  res.status(200).json(await safetyNetService.dismissEarly(user.id, id));
});
