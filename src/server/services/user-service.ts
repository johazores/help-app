import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { hashPin, verifyPin } from "@/lib/crypto";
import { issueToken } from "@/lib/jwt";
import { stellarService } from "@/server/services/stellar-service";

function normalizePhone(input: string): string {
  const trimmed = input.replace(/[\s-]/g, "");
  if (!/^(\+?63|0)?9\d{9}$/.test(trimmed)) {
    throw new ApiError(400, "Please enter a valid mobile number.");
  }
  // Normalize to 09XXXXXXXXX
  const digits = trimmed.replace(/^\+?63/, "0").replace(/^(?!0)/, "0");
  return digits.startsWith("0") ? digits : `0${digits}`;
}

class UserService {
  async signUp(input: { name: string; phone: string; pin: string }) {
    const name = input.name.trim();
    if (name.length < 2) throw new ApiError(400, "Please enter your name.");
    if (!/^\d{6}$/.test(input.pin)) throw new ApiError(400, "Your PIN must be 6 numbers.");

    const phone = normalizePhone(input.phone);
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) throw new ApiError(409, "That mobile number already has an account.");

    // Give the new user a funded custodial account.
    const account = await stellarService.createFundedAccount();

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        pinHash: hashPin(input.pin),
        stellarAccount: { connect: { id: account.id } },
      },
    });

    return { token: issueToken(user), user: this.publicUser(user) };
  }

  async signIn(input: { phone: string; pin: string }) {
    const phone = normalizePhone(input.phone);
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || !verifyPin(input.pin, user.pinHash)) {
      throw new ApiError(401, "That mobile number or PIN doesn't match.");
    }
    return { token: issueToken(user), user: this.publicUser(user) };
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
    return { ...this.publicUser(user), balance };
  }

  private publicUser(user: { id: string; name: string; phone: string }) {
    return { id: user.id, name: user.name, phone: user.phone };
  }
}

export const userService = new UserService();
