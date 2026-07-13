import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, requireUser } from "@/lib/api";
import { safetyNetService } from "@/server/services/safety-net-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const user = await requireUser(req);
  const { label, checkInIntervalMinutes, splits } = req.body ?? {};
  const created = await safetyNetService.createSplit(user.id, {
    label: String(label ?? ""),
    checkInIntervalMinutes: Number(checkInIntervalMinutes),
    splits: Array.isArray(splits)
      ? splits.map((s: { recipientId?: string; amount?: string }) => ({
          recipientId: String(s.recipientId ?? ""),
          amount: String(s.amount ?? ""),
        }))
      : [],
  });
  res.status(201).json(created);
});
