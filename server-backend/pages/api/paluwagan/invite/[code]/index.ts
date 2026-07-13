import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler } from "@/lib/api";
import { paluwaganService } from "@/server/services/paluwagan-service";

// Public summary of an invite (no login needed to look at it).
export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  res.status(200).json(await paluwaganService.inviteSummary(String(req.query.code)));
});
