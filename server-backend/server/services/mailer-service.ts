import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";

/**
 * Sends real email via SMTP configured in the Setting table (seeded from env).
 * If SMTP isn't configured, callers receive an explicit, honest error rather
 * than a silent no-op — nothing here pretends to send.
 */
class MailerService {
  private async config() {
    const keys = ["smtp.host", "smtp.port", "smtp.user", "smtp.pass", "smtp.from"];
    const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
    const map = Object.fromEntries(
      rows.map((r: { key: string; value: string }) => [r.key, r.value]),
    );
    if (!map["smtp.host"] || !map["smtp.from"]) return null;
    return {
      host: map["smtp.host"],
      port: Number(map["smtp.port"] ?? 465),
      user: map["smtp.user"],
      pass: map["smtp.pass"],
      from: map["smtp.from"],
    };
  }

  async isConfigured(): Promise<boolean> {
    return (await this.config()) !== null;
  }

  async send(to: string, subject: string, text: string): Promise<void> {
    const cfg = await this.config();
    if (!cfg) {
      throw new ApiError(
        503,
        "Email isn't set up on this server yet, so we can't send codes. Please contact support.",
      );
    }
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    });
    await transporter.sendMail({ from: cfg.from, to, subject, text });
  }
}

export const mailerService = new MailerService();
