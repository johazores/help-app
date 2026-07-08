import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, rateLimit, requireUser } from "@/lib/api";
import { paluwaganService } from "@/server/services/paluwagan-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["GET", "POST"])) return;
  const user = await requireUser(req);
  if (req.method === "GET") {
    res.status(200).json(await paluwaganService.listMine(user.id));
    return;
  }
  rateLimit(`plw-create:${user.id}`, 5, 60 * 60_000);
  const { name, amount, frequencyMinutes, pin } = req.body ?? {};
  res.status(201).json(
    await paluwaganService.create(user.id, {
      name: String(name ?? ""),
      amount: String(amount ?? ""),
      frequencyMinutes: Number(frequencyMinutes),
      pin: String(pin ?? ""),
    }),
  );
});
