import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, requireUser } from "@/lib/api";
import { safetyNetService } from "@/server/services/safety-net-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["GET", "POST"])) return;
  const user = await requireUser(req);

  if (req.method === "GET") {
    res.status(200).json(await safetyNetService.list(user.id));
    return;
  }
  const { label, amount, recipientId, checkInIntervalMinutes, kind, opensAt } = req.body ?? {};
  const created = await safetyNetService.create(user.id, {
    label,
    amount,
    recipientId,
    checkInIntervalMinutes: Number(checkInIntervalMinutes),
    kind: kind ? String(kind) : undefined,
    opensAt: opensAt ? String(opensAt) : undefined,
  });
  res.status(201).json(created);
});
