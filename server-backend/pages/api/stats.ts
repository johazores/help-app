import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler } from "@/lib/api";
import { impactService } from "@/server/services/impact-service";

// Public, aggregate-only activity figures with verifiable transaction links.
export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  res.setHeader("Cache-Control", "public, max-age=60");
  res.status(200).json(await impactService.stats());
});
