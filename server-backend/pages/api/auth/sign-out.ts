import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, requireUser } from "@/lib/api";
import { sessionService } from "@/server/services/session-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const user = await requireUser(req);
  await sessionService.revokeUserCurrent(user.sessionId);
  res.status(200).json({ ok: true });
});
