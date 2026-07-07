import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, requireAdmin } from "@/lib/api";
import { adminService } from "@/server/services/admin-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  await requireAdmin(req); // separate admin identity
  res.status(200).json(await adminService.overview());
});
