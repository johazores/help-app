import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { hashPin, verifyPin } from "@/lib/crypto";
import { normalizeEmail, normalizePhone } from "@/server/services/user-service";
import { sessionService } from "@/server/services/session-service";
import { verificationService } from "@/server/services/verification-service";

const AVATAR_MAX_BYTES = 200 * 1024; // ~200 KB after client-side resize

/** Profile, email, PIN, avatar, and recovery — the account-management core. */
class AccountService {
  async updateName(userId: string, name: string) {
    const trimmed = name.trim();
    if (trimmed.length < 2) throw new ApiError(400, "Please enter your name.");
    await prisma.user.update({ where: { id: userId }, data: { name: trimmed } });
    return { name: trimmed };
  }

  async updateAvatar(userId: string, avatar: string | null) {
    if (avatar !== null) {
      if (!/^data:image\/(jpeg|png|webp);base64,/.test(avatar)) {
        throw new ApiError(400, "That photo format isn't supported.");
      }
      if (Buffer.byteLength(avatar, "utf8") > AVATAR_MAX_BYTES) {
        throw new ApiError(400, "That photo is too large. Please pick a smaller one.");
      }
    }
    await prisma.user.update({ where: { id: userId }, data: { avatar } });
    return { ok: true };
  }

  /** Step 1 of adding/changing email: send a code to the NEW address. */
  async requestEmailChange(userId: string, emailInput: string) {
    const email = normalizeEmail(emailInput);
    const taken = await prisma.user.findFirst({ where: { email, id: { not: userId } } });
    if (taken) throw new ApiError(409, "That email is already used by another account.");
    await verificationService.issue(userId, email, "EMAIL_VERIFY");
    return { sentTo: email };
  }

  /** Step 2: confirm the code; the verified address becomes the account email. */
  async confirmEmail(userId: string, code: string) {
    if (!/^\d{6}$/.test(code)) throw new ApiError(400, "Please enter the 6-number code.");
    const email = await verificationService.consume(userId, "EMAIL_VERIFY", code);
    await prisma.user.update({
      where: { id: userId },
      data: { email, emailVerifiedAt: new Date() },
    });
    return { email, emailVerified: true };
  }

  async changePin(userId: string, currentPin: string, newPin: string, keepSessionId: string) {
    if (!/^\d{6}$/.test(newPin)) throw new ApiError(400, "Your new PIN must be 6 numbers.");
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !verifyPin(currentPin, user.pinHash)) {
      throw new ApiError(401, "Your current PIN doesn't match.");
    }
    if (currentPin === newPin) throw new ApiError(400, "Your new PIN must be different.");
    await prisma.user.update({ where: { id: userId }, data: { pinHash: hashPin(newPin) } });
    // Security: signing every other device out after a PIN change.
    await sessionService.revokeAllUserSessions(userId, keepSessionId);
    return { ok: true };
  }

  // ---- Forgot PIN (recovery via verified email) -----------------------------

  async forgotPin(phoneInput: string) {
    const phone = normalizePhone(phoneInput);
    const user = await prisma.user.findUnique({ where: { phone } });
    // Same response whether or not the account exists (no account enumeration),
    // except the honest case where recovery is impossible without an email.
    if (!user) return { sent: true };
    if (!user.email || !user.emailVerifiedAt) {
      throw new ApiError(
        400,
        "This account has no verified email, so we can't send a recovery code. Please contact support.",
      );
    }
    await verificationService.issue(user.id, user.email, "PIN_RESET");
    return { sent: true };
  }

  async resetPin(phoneInput: string, code: string, newPin: string) {
    const phone = normalizePhone(phoneInput);
    if (!/^\d{6}$/.test(newPin)) throw new ApiError(400, "Your new PIN must be 6 numbers.");
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) throw new ApiError(400, "That code doesn't match. Please check and try again.");
    await verificationService.consume(user.id, "PIN_RESET", code);
    await prisma.user.update({ where: { id: user.id }, data: { pinHash: hashPin(newPin) } });
    // Recovery signs out ALL devices, including any attacker's.
    await sessionService.revokeAllUserSessions(user.id);
    return { ok: true };
  }
}

export const accountService = new AccountService();
