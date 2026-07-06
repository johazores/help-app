import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler } from "@/lib/api";
import { userService } from "@/server/services/user-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const { name, phone, pin } = req.body ?? {};
  const result = await userService.signUp({ name, phone, pin });
  res.status(201).json(result);
});
