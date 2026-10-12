import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { hashPin, verifyPin } from "@/lib/crypto";
import { sessionService } from "@/server/services/session-service";

let decoyPasswordHash: string | null = null;

/** Root-admin sign-in — a completely separate identity from app users. */
class AdminAuthService {
  async signIn(input: { identity: string; password: string; device: string }) {
    const identity = input.identity.trim().toLowerCase();
    const admin = identity
      ? await prisma.adminUser.findFirst({
          where: { OR: [{ username: identity }, { email: identity }] },
        })
      : null;
    // Constant-shape failure: the same hash work runs whether or not the
    // admin exists, so neither the message nor the timing reveals usernames.
    decoyPasswordHash ??= hashPin("decoy-password");
    const passwordMatches = verifyPin(input.password, admin?.passwordHash ?? decoyPasswordHash);
    if (!admin || !passwordMatches) {
      throw new ApiError(401, "Those admin details don't match.");
    }
    const token = await sessionService.createForAdmin(admin.id, input.device);
    return { token, admin: { id: admin.id, name: admin.name, username: admin.username } };
  }
}

export const adminAuthService = new AdminAuthService();
