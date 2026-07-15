import { SafetyNetStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mailerService } from "@/server/services/mailer-service";

const MINUTE_MS = 60_000;
const REMINDER_COOLDOWN_MS = 12 * 60 * MINUTE_MS;
/** Send when half the check-in window has elapsed. */
const REMINDER_PROGRESS = 0.5;

function windowProgress(lastCheckIn: Date, unlockAt: Date): number {
  const start = lastCheckIn.getTime();
  const end = unlockAt.getTime();
  const now = Date.now();
  if (end <= start) return 1;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

/**
 * Sends gentle check-in reminder emails to owners whose safety-net window
 * is more than half elapsed. Requires verified email + SMTP.
 */
class ReminderService {
  async runCheckInReminders(): Promise<{ scanned: number; sent: number; skipped: number }> {
    if (!(await mailerService.isConfigured())) {
      return { scanned: 0, sent: 0, skipped: 0 };
    }

    const now = new Date();
    const nets = await prisma.safetyNet.findMany({
      where: {
        status: SafetyNetStatus.ACTIVE,
        kind: "SAFETY_NET",
        unlockAt: { gt: now },
      },
      include: {
        owner: { select: { id: true, name: true, email: true, emailVerifiedAt: true } },
        recipient: { select: { name: true } },
      },
    });

    let sent = 0;
    let skipped = 0;

    for (const net of nets) {
      const progress = windowProgress(net.lastCheckInAt, net.unlockAt);
      if (progress < REMINDER_PROGRESS) {
        skipped++;
        continue;
      }

      if (net.lastReminderAt && now.getTime() - net.lastReminderAt.getTime() < REMINDER_COOLDOWN_MS) {
        skipped++;
        continue;
      }

      const email = net.owner.email;
      if (!email || !net.owner.emailVerifiedAt) {
        skipped++;
        continue;
      }

      const firstName = net.owner.name.split(" ")[0];
      const msLeft = net.unlockAt.getTime() - now.getTime();
      const hoursLeft = Math.max(1, Math.ceil(msLeft / (60 * MINUTE_MS)));

      try {
        await mailerService.send(
          email,
          `Reminder: check in for ${net.recipient.name}'s safety net`,
          [
            `Hi ${firstName},`,
            "",
            `Your safety net "${net.label}" for ${net.recipient.name} will open to them in about ${hoursLeft} hour(s) if you don't check in.`,
            "",
            "Open Sagip and tap \"I'm okay — check in\" to keep the money in your hands.",
            "",
            "— Sagip",
          ].join("\n"),
        );
        await prisma.safetyNet.update({
          where: { id: net.id },
          data: { lastReminderAt: now },
        });
        sent++;
      } catch (err) {
        console.error(`Reminder failed for net ${net.id}:`, err);
        skipped++;
      }
    }

    return { scanned: nets.length, sent, skipped };
  }
}

export const reminderService = new ReminderService();
