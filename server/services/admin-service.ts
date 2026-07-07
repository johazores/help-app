import { prisma } from "@/lib/prisma";
import { settingsService } from "@/server/services/settings-service";

/**
 * Read-only admin views for a ROOT account. Never exposes secret keys — only
 * public keys (which are safe to share) and on-chain transaction hashes.
 */

type Role = "USER" | "ROOT";
type Status = "ACTIVE" | "OPENED" | "RECEIVED" | "CLOSED";

interface UserRow {
  id: string;
  name: string;
  phone: string;
  role: Role;
  createdAt: Date;
  stellarAccount: { publicKey: string } | null;
  _count: { safetyNets: number; recipients: number };
}

interface NetRow {
  id: string;
  label: string;
  amount: string;
  status: Status;
  unlockAt: Date;
  createdAt: Date;
  owner: { name: string };
  recipient: { name: string };
}

interface ActivityRow {
  id: string;
  type: string;
  description: string;
  txHash: string | null;
  createdAt: Date;
  safetyNet: { label: string; owner: { name: string } };
}

class AdminService {
  async overview() {
    const explorer = await settingsService.explorer();

    const [userCount, netCount, activeCount, receivedCount, users, nets, activity] =
      await Promise.all([
        prisma.user.count(),
        prisma.safetyNet.count(),
        prisma.safetyNet.count({ where: { status: "ACTIVE" } }),
        prisma.safetyNet.count({ where: { status: "RECEIVED" } }),
        prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          include: {
            stellarAccount: { select: { publicKey: true } },
            _count: { select: { safetyNets: true, recipients: true } },
          },
        }) as unknown as Promise<UserRow[]>,
        prisma.safetyNet.findMany({
          orderBy: { createdAt: "desc" },
          include: { owner: { select: { name: true } }, recipient: { select: { name: true } } },
        }) as unknown as Promise<NetRow[]>,
        prisma.activity.findMany({
          orderBy: { createdAt: "desc" },
          take: 200,
          where: { txHash: { not: null } },
          include: { safetyNet: { select: { label: true, owner: { select: { name: true } } } } },
        }) as unknown as Promise<ActivityRow[]>,
      ]);

    const totalSetAside = nets
      .filter((n) => n.status === "ACTIVE" || n.status === "OPENED")
      .reduce((sum, n) => sum + Number(n.amount), 0);

    return {
      explorer,
      stats: {
        users: userCount,
        safetyNets: netCount,
        active: activeCount,
        received: receivedCount,
        totalSetAside: totalSetAside.toString(),
      },
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        role: u.role,
        publicKey: u.stellarAccount?.publicKey ?? null,
        safetyNets: u._count.safetyNets,
        recipients: u._count.recipients,
        createdAt: u.createdAt.toISOString(),
      })),
      safetyNets: nets.map((n) => ({
        id: n.id,
        label: n.label,
        amount: n.amount,
        status: n.status,
        ownerName: n.owner.name,
        recipientName: n.recipient.name,
        unlockAt: n.unlockAt.toISOString(),
        createdAt: n.createdAt.toISOString(),
      })),
      transactions: activity.map((a) => ({
        id: a.id,
        type: a.type,
        description: a.description,
        txHash: a.txHash,
        netLabel: a.safetyNet.label,
        ownerName: a.safetyNet.owner.name,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }
}

export const adminService = new AdminService();
