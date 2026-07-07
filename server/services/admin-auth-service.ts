import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { verifyPin } from "@/lib/crypto";
import { sessionService } from "@/server/services/session-service";

/** Root-admin sign-in — a completely separate identity from app users. */
class AdminAuthService {
  async signIn(input: { identity: string; password: string; device: string }) {
    const identity = input.identity.trim().toLowerCase();
    const admin = await prisma.adminUser.findFirst({
      where: { OR: [{ username: identity }, { email: identity }] },
    });
    // Constant-shape failure: never reveal whether the username exists.
    if (!admin || !verifyPin(input.password, admin.passwordHash)) {
      throw new ApiError(401, "Those admin details don't match.");
    }
    const token = await sessionService.createForAdmin(admin.id, input.device);
    return { token, admin: { id: admin.id, name: admin.name, username: admin.username } };
  }
}

export const adminAuthService = new AdminAuthService();
