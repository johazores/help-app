import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { issueToken, TOKEN_TTL_SECONDS } from "@/lib/jwt";

/** Creates and manages sessions for users and admins (separate tables). */
class SessionService {
  private expiry(): Date {
    return new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);
  }

  async createForUser(userId: string, device: string): Promise<string> {
    const session = await prisma.userSession.create({
      data: { userId, device, expiresAt: this.expiry() },
    });
    return issueToken(userId, session.id, "user");
  }

  async createForAdmin(adminId: string, device: string): Promise<string> {
    const session = await prisma.adminSession.create({
      data: { adminId, device, expiresAt: this.expiry() },
    });
    return issueToken(adminId, session.id, "admin");
  }

  async listForUser(userId: string, currentSessionId: string) {
    const sessions = await prisma.userSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: "desc" },
    });
    return sessions.map((s: {
      id: string; device: string; lastSeenAt: Date; createdAt: Date;
    }) => ({
      id: s.id,
      device: s.device,
      lastSeenAt: s.lastSeenAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      current: s.id === currentSessionId,
    }));
  }

  async revokeUserSession(userId: string, sessionId: string, currentSessionId: string) {
    if (sessionId === currentSessionId) {
      throw new ApiError(400, "To sign out this device, use Sign out instead.");
    }
    const session = await prisma.userSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw new ApiError(404, "That session wasn't found.");
    await prisma.userSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
  }

  /** Revoke every session; optionally keep one (e.g. the current device). */
  async revokeAllUserSessions(userId: string, keepSessionId?: string) {
    await prisma.userSession.updateMany({
      where: { userId, revokedAt: null, ...(keepSessionId ? { id: { not: keepSessionId } } : {}) },
      data: { revokedAt: new Date() },
    });
  }

  async revokeUserCurrent(sessionId: string) {
    await prisma.userSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAdminCurrent(sessionId: string) {
    await prisma.adminSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export const sessionService = new SessionService();
