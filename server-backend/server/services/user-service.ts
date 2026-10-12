import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { hashPin, verifyPin } from "@/lib/crypto";
import { normalizeEmail, normalizePhone, requirePin } from "@/lib/validation";
import { sessionService } from "@/server/services/session-service";
import { stellarService } from "@/server/services/stellar-service";
import { mailerService } from "@/server/services/mailer-service";
import { verificationService } from "@/server/services/verification-service";

// Compared against when no account matches, so a wrong number and a wrong
// PIN take the same time and the response can't reveal who has an account.
let decoyPinHash: string | null = null;
function decoyHash(): string {
  decoyPinHash ??= hashPin("000000");
  return decoyPinHash;
}

class UserService {
  async signUp(input: { name: string; phone: string; pin: string; email?: string; device: string }) {
    const name = input.name.trim().slice(0, 60);
    if (name.length < 2) throw new ApiError(400, "Please enter your name.");
    const pin = requirePin(input.pin);

    const phone = normalizePhone(input.phone);
    const email = input.email?.trim() ? normalizeEmail(input.email) : null;

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) throw new ApiError(409, "That mobile number already has an account.");
    if (email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) throw new ApiError(409, "That email is already used by another account.");
    }

    // No wallet yet — the person chooses to create or import one right after
    // sign-up, in the wallet onboarding flow.
    const user = await prisma.user.create({
      data: { name, phone, email, pinHash: hashPin(pin) },
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
    const pinMatches = verifyPin(input.pin, user?.pinHash ?? decoyHash());
    if (!user || !pinMatches) {
      throw new ApiError(401, "That mobile number or PIN doesn't match.");
    }
    const token = await sessionService.createForUser(user.id, input.device);
    return { token, user: { id: user.id, name: user.name, phone: user.phone } };
  }

  async profile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallets: { include: { stellarAccount: true } } },
    });
    if (!user) throw new ApiError(404, "Account not found.");

    const active =
      user.wallets.find((w: { id: string; name: string; stellarAccount: { publicKey: string } }) => w.id === user.activeWalletId) ?? user.wallets[0] ?? null;
    let balance = "0";
    if (active) {
      balance = await stellarService.availableBalance(active.stellarAccount.publicKey);
    }
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
      avatar: user.avatar,
      balance,
      hasWallet: user.wallets.length > 0,
      activeWalletName: active?.name ?? null,
    };
  }
}

export const userService = new UserService();
