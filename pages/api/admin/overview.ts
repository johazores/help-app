import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, requireRoot } from "@/lib/api";
import { adminService } from "@/server/services/admin-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  await requireRoot(req); // ROOT only
  res.status(200).json(await adminService.overview());
});
