import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { hashPin, verifyPin } from "@/lib/crypto";
import { sessionService } from "@/server/services/session-service";
import { stellarService } from "@/server/services/stellar-service";
import { mailerService } from "@/server/services/mailer-service";
import { verificationService } from "@/server/services/verification-service";

export function normalizePhone(input: string): string {
  const trimmed = input.replace(/[\s-]/g, "");
  if (!/^(\+?63|0)?9\d{9}$/.test(trimmed)) {
    throw new ApiError(400, "Please enter a valid mobile number.");
  }
  const digits = trimmed.replace(/^\+?63/, "0").replace(/^(?!0)/, "0");
  return digits.startsWith("0") ? digits : `0${digits}`;
}

export function normalizeEmail(input: string): string {
  const email = input.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new ApiError(400, "Please enter a valid email address.");
  }
  return email;
}

class UserService {
  async signUp(input: { name: string; phone: string; pin: string; email?: string; device: string }) {
    const name = input.name.trim();
    if (name.length < 2) throw new ApiError(400, "Please enter your name.");
    if (!/^\d{6}$/.test(input.pin)) throw new ApiError(400, "Your PIN must be 6 numbers.");

    const phone = normalizePhone(input.phone);
    const email = input.email?.trim() ? normalizeEmail(input.email) : null;

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) throw new ApiError(409, "That mobile number already has an account.");
    if (email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) throw new ApiError(409, "That email is already used by another account.");
    }

    const account = await stellarService.createFundedAccount();
    const user = await prisma.user.create({
      data: {
        name,
        phone,
        email,
        pinHash: hashPin(input.pin),
        stellarAccount: { connect: { id: account.id } },
      },
    });

    // Best-effort verification email; sign-up must not fail if SMTP is absent.
    let verificationSent = false;
    if (email && (await mailerService.isConfigured())) {
      try {
        await verificationService.issue(user.id, email, "EMAIL_VERIFY");
        verificationSent = true;
      } catch {
        verificationSent = false;
      }
    }

    const token = await sessionService.createForUser(user.id, input.device);
    return { token, user: { id: user.id, name: user.name, phone: user.phone }, verificationSent };
  }

  async signIn(input: { phone: string; pin: string; device: string }) {
    const phone = normalizePhone(input.phone);
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || !verifyPin(input.pin, user.pinHash)) {
      throw new ApiError(401, "That mobile number or PIN doesn't match.");
    }
    const token = await sessionService.createForUser(user.id, input.device);
    return { token, user: { id: user.id, name: user.name, phone: user.phone } };
  }

  async profile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { stellarAccount: true },
    });
    if (!user) throw new ApiError(404, "Account not found.");

    let balance = "0";
    if (user.stellarAccount) {
      balance = await stellarService.availableBalance(user.stellarAccount.publicKey);
    }
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
      avatar: user.avatar,
      balance,
    };
  }
}

export const userService = new UserService();
