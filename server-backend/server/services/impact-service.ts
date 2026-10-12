import { ActivityType, SafetyNetStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { settingsService } from "@/server/services/settings-service";

const CACHE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ImpactStats {
  network: string;
  explorerTxUrl: string;
  totals: {
    families: number;
    safetyNets: number;
    protectedNow: number;
    checkIns: number;
    deliveredToFamily: number;
    backupHandovers: number;
    confirmedTransactions: number;
  };
  last30Days: { safetyNets: number; checkIns: number; confirmedTransactions: number };
  latestReceipts: Array<{ action: ActivityType; txHash: string; confirmedAt: string }>;
  generatedAt: string;
}

/**
 * Public, aggregate-only activity figures. No names, phone numbers, amounts
 * or account addresses leave this service; transaction hashes are already
 * public on the network and let anyone verify the counts independently.
 */
class ImpactService {
  private cache: { value: ImpactStats; at: number } | null = null;

  async stats(): Promise<ImpactStats> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.value;

    const since = new Date(Date.now() - 30 * DAY_MS);
    const now = new Date();
    const delivered = [SafetyNetStatus.RECEIVED, SafetyNetStatus.GUARDED, SafetyNetStatus.BACKUP_RECEIVED];

    const [
      families,
      safetyNets,
      protectedNow,
      checkIns,
      deliveredToFamily,
      backupHandovers,
      confirmedTransactions,
      recentNets,
      recentCheckIns,
      recentTransactions,
      latest,
      explorer,
    ] = await Promise.all([
      prisma.user.count({ where: { safetyNets: { some: {} } } }),
      prisma.safetyNet.count(),
      prisma.safetyNet.count({ where: { status: SafetyNetStatus.ACTIVE, unlockAt: { gt: now } } }),
      prisma.activity.count({
        where: { type: { in: [ActivityType.CHECKED_IN, ActivityType.RECEIVER_CHECKED_IN] } },
      }),
      prisma.safetyNet.count({ where: { status: { in: delivered } } }),
      prisma.safetyNet.count({ where: { status: SafetyNetStatus.BACKUP_RECEIVED } }),
      prisma.activity.count({ where: { txHash: { not: null } } }),
      prisma.safetyNet.count({ where: { createdAt: { gte: since } } }),
      prisma.activity.count({
        where: {
          createdAt: { gte: since },
          type: { in: [ActivityType.CHECKED_IN, ActivityType.RECEIVER_CHECKED_IN] },
        },
      }),
      prisma.activity.count({ where: { createdAt: { gte: since }, txHash: { not: null } } }),
      prisma.activity.findMany({
        where: { txHash: { not: null } },
        select: { type: true, txHash: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      settingsService.explorer(),
    ]);

    const value: ImpactStats = {
      network: explorer.network,
      explorerTxUrl: explorer.explorerTxUrl,
      totals: {
        families,
        safetyNets,
        protectedNow,
        checkIns,
        deliveredToFamily,
        backupHandovers,
        confirmedTransactions,
      },
      last30Days: {
        safetyNets: recentNets,
        checkIns: recentCheckIns,
        confirmedTransactions: recentTransactions,
      },
      latestReceipts: latest.map((a) => ({
        action: a.type,
        txHash: a.txHash as string,
        confirmedAt: a.createdAt.toISOString(),
      })),
      generatedAt: new Date().toISOString(),
    };
    this.cache = { value, at: Date.now() };
    return value;
  }
}

export const impactService = new ImpactService();
