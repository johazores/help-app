import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler } from "@/lib/api";
import { ratesService } from "@/server/services/rates-service";

// Public: live market rates for XLM (cached server-side).
export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  res.status(200).json(await ratesService.get());
});
