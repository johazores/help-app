import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler, rateLimit, requireUser } from "@/lib/api";
import { walletService } from "@/server/services/wallet-service";

export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["POST"])) return;
  const user = await requireUser(req);
  // Top-ups draw on a shared test treasury or the public test faucet.
  await rateLimit("test-funds", user.id, 10, 60 * 60_000);
  res.status(200).json(await walletService.addTestFunds(user.id, req.body?.amount ?? "500"));
});
