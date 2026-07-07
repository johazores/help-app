import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, requireUser } from "@/lib/api";
import { sessionService } from "@/server/services/session-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["GET", "DELETE"])) return;
  const user = await requireUser(req);

  if (req.method === "GET") {
    res.status(200).json(await sessionService.listForUser(user.id, user.sessionId));
    return;
  }
  const { sessionId, all } = req.body ?? {};
  if (all === true) {
    await sessionService.revokeAllUserSessions(user.id, user.sessionId);
  } else {
    await sessionService.revokeUserSession(user.id, String(sessionId), user.sessionId);
  }
  res.status(200).json({ ok: true });
});
