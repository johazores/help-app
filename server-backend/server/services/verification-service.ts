import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { hashPin, verifyPin } from "@/lib/crypto";
import { mailerService } from "@/server/services/mailer-service";

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export type CodePurpose = "EMAIL_VERIFY" | "PIN_RESET";

/** Issues and checks one-time 6-digit codes, delivered by email. */
class VerificationService {
  async issue(userId: string, email: string, purpose: CodePurpose): Promise<void> {
    const code = String(randomInt(100000, 1000000)); // 6 digits, crypto-random

    // Invalidate previous codes for the same purpose, then store the new one.
    await prisma.verificationCode.updateMany({
      where: { userId, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    await prisma.verificationCode.create({
      data: {
        userId,
        identifier: email,
        codeHash: hashPin(code),
        purpose,
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    });

    const subject =
      purpose === "EMAIL_VERIFY" ? "Your Sagip verification code" : "Your Sagip recovery code";
    await mailerService.send(
      email,
      subject,
      `Your code is ${code}. It works for 15 minutes. If you didn't ask for this, you can ignore it.`,
    );
  }

  /** Verifies and consumes a code. Returns the email it was sent to. */
  async consume(userId: string, purpose: CodePurpose, code: string): Promise<string> {
    const record = await prisma.verificationCode.findFirst({
      where: { userId, purpose, consumedAt: null },
      orderBy: { expiresAt: "desc" },
    });
    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw new ApiError(400, "That code has expired. Please request a new one.");
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      throw new ApiError(429, "Too many wrong tries. Please request a new code.");
    }
    if (!verifyPin(code, record.codeHash)) {
      await prisma.verificationCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new ApiError(400, "That code doesn't match. Please check and try again.");
    }
    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    return record.identifier;
  }
}

export const verificationService = new VerificationService();
