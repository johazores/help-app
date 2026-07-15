import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, requireAdmin } from "@/lib/api";
import { sessionService } from "@/server/services/session-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const admin = await requireAdmin(req);
  await sessionService.revokeAdminCurrent(admin.sessionId);
  res.status(200).json({ ok: true });
});
