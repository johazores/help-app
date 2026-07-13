import type { NextApiRequest, NextApiResponse } from "next";
import { allowMethods, handler } from "@/lib/api";
import { settingsService } from "@/server/services/settings-service";

// Public, non-sensitive config so the client can build explorer links.
export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["GET"])) return;
  const [explorer, asset] = await Promise.all([settingsService.explorer(), settingsService.asset()]);
  res.status(200).json({ ...explorer, heldAsset: asset.heldAsset });
});
