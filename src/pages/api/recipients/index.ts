import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, requireUser } from "@/lib/api";
import { recipientService } from "@/server/services/recipient-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["GET", "POST"])) return;
  const user = await requireUser(req);

  if (req.method === "GET") {
    res.status(200).json(await recipientService.list(user.id));
    return;
  }
  const { name, relationship, phone } = req.body ?? {};
  const created = await recipientService.create(user.id, { name, relationship, phone });
  res.status(201).json(created);
});
