import type { NextApiRequest, NextApiResponse } from "next";
import { reminderService } from "@/server/services/reminder-service";

/**
 * Cron endpoint for check-in reminder emails.
 * Protect with CRON_SECRET in the Authorization header:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Schedule hourly via GitHub Actions, Vercel Cron, or similar.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization ?? "";
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "Unauthorized." });
    }
  }

  const result = await reminderService.runCheckInReminders();
  return res.status(200).json(result);
}
