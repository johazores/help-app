import type { NextApiRequest, NextApiResponse } from "next";
import { ApiError, allowMethods, handler, pruneRateLimits, secretsMatch } from "@/lib/api";
import { log } from "@/lib/log";
import { reminderService } from "@/server/services/reminder-service";

/**
 * Hourly maintenance: check-in reminder emails plus expired rate-limit cleanup.
 *
 * Requires `Authorization: Bearer <CRON_SECRET>`. Accepts POST (GitHub
 * Actions) and GET (Vercel Cron). Without CRON_SECRET the endpoint only runs
 * in local development, so a misconfigured deployment can't be triggered by
 * strangers.
 */
export default handler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (!allowMethods(req, res, ["GET", "POST"])) return;

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new ApiError(503, "Scheduled jobs are not configured on this server.");
    }
  } else if (!secretsMatch((req.headers.authorization ?? "").replace(/^Bearer /, ""), secret)) {
    throw new ApiError(401, "Unauthorized.");
  }

  const reminders = await reminderService.runCheckInReminders();
  const prunedRateLimits = await pruneRateLimits();
  log("info", "cron.reminders", { ...reminders, prunedRateLimits });
  res.status(200).json({ ...reminders, prunedRateLimits });
});
