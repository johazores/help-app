import { randomBytes } from "node:crypto";
import { ActivityType, SafetyNetStatus, type SafetyNet } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { stellarService } from "@/server/services/stellar-service";
import { recipientService } from "@/server/services/recipient-service";
import { walletService } from "@/server/services/wallet-service";
import { settingsService } from "@/server/services/settings-service";

const MINUTE_MS = 60 * 1000;
const CHECK_IN_INTERVALS = [1, 10080, 43200, 129600];

function makeClaimCode(): string {
  // Public claim links authorize money-moving actions. New links therefore use
  // a full 128 bits of entropy; existing shorter links remain valid in the DB.
  return randomBytes(16).toString("base64url");
}

type NetRow = SafetyNet & {
  recipient: { name: string; relationship: string };
  backupRecipient?: { name: string; relationship: string } | null;
};

/** Shape sent to the UI. Contains no technical terms. */
function present(net: NetRow) {
  const now = Date.now();
  const isOpen =
    net.status === SafetyNetStatus.ACTIVE && net.unlockAt.getTime() <= now;
  return {
    id: net.id,
    kind: net.kind ?? "SAFETY_NET",
    requestState: net.requestState ?? "NONE",
    label: net.label,
    amount: net.amount,
    forName: net.recipient.name,
    forRelationship: net.recipient.relationship,
    backupName: net.backupRecipient?.name ?? null,
    backupRelationship: net.backupRecipient?.relationship ?? null,
    postReceiptCheckInIntervalMinutes: net.postReceiptCheckInIntervalMinutes,
    postReceiptUnlockAt: net.postReceiptUnlockAt?.toISOString() ?? null,
    postReceiptLastCheckInAt: net.postReceiptLastCheckInAt?.toISOString() ?? null,
    checkInIntervalMinutes: net.checkInIntervalMinutes,
    unlockAt: net.unlockAt.toISOString(),
    lastCheckInAt: net.lastCheckInAt.toISOString(),
    claimCode: net.claimCode,
    status: net.status,
    isOpen,
    createdAt: net.createdAt.toISOString(),
  };
}

function guardInterval(net: SafetyNet): number {
  return net.postReceiptCheckInIntervalMinutes ?? net.checkInIntervalMinutes;
}

class SafetyNetService {
  async list(ownerId: string) {
    const nets = await prisma.safetyNet.findMany({
      where: { ownerId },
      include: { recipient: true, backupRecipient: true },
      orderBy: { createdAt: "desc" },
    });
    return nets.map(present);
  }

  async detail(ownerId: string, id: string) {
    const net = await prisma.safetyNet.findFirst({
      where: { id, ownerId },
      include: {
        recipient: true,
        backupRecipient: true,
        activity: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!net) throw new ApiError(404, "We couldn't find that safety net.");
    return {
      ...present(net),
      activity: net.activity.map((a) => ({
        id: a.id,
        type: a.type,
        description: a.description,
        txHash: a.txHash,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }

  async cardSummary(ownerId: string, id: string) {
    const net = await prisma.safetyNet.findFirst({
      where: { id, ownerId },
      select: {
        amount: true,
        claimCode: true,
        recipient: { select: { name: true } },
      },
    });
    if (!net) throw new ApiError(404, "We couldn't find that safety net.");
    return {
      forName: net.recipient.name,
      amount: net.amount,
      claimCode: net.claimCode,
    };
  }

  async create(
    ownerId: string,
    input: {
      label: string;
      amount: string;
      recipientId: string;
      checkInIntervalMinutes: number;
      backupRecipientId?: string;
      postReceiptCheckInIntervalMinutes?: number;
      kind?: string;
      opensAt?: string;
    },
  ) {
    const label = input.label.trim();
    if (label.length < 2) throw new ApiError(400, "Please give this a short name.");
    const kind = input.kind === "GIFT" ? "GIFT" : "SAFETY_NET";

    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ApiError(400, "Please enter how much you want to set aside.");
    }
    const interval = Math.round(input.checkInIntervalMinutes) || 43200;
    if (kind === "SAFETY_NET" && !CHECK_IN_INTERVALS.includes(interval)) {
      throw new ApiError(400, "Please choose how often you'll check in.");
    }

    let backupRecipientId: string | null = null;
    let postReceiptInterval: number | null = null;
    if (input.backupRecipientId) {
      if (input.backupRecipientId === input.recipientId) {
        throw new ApiError(400, "Please choose someone different as the backup.");
      }
      const backup = await recipientService.requireOwned(ownerId, input.backupRecipientId);
      backupRecipientId = backup.id;
      postReceiptInterval = Math.round(input.postReceiptCheckInIntervalMinutes ?? interval) || interval;
      if (!CHECK_IN_INTERVALS.includes(postReceiptInterval)) {
        throw new ApiError(400, "Please choose how often they should check in after receiving.");
      }
    }

    const wallet = await walletService.requireActive(ownerId);
    const recipient = await recipientService.requireOwned(ownerId, input.recipientId);

    let unlockAt: Date;
    if (kind === "GIFT") {
      unlockAt = input.opensAt ? new Date(input.opensAt) : new Date();
      if (Number.isNaN(unlockAt.getTime())) throw new ApiError(400, "Please choose a valid date.");
      if (unlockAt.getTime() < Date.now() - 5 * 60_000) {
        throw new ApiError(400, "That date has already passed. Please choose today or a future date.");
      }
      if (unlockAt.getTime() > Date.now() + 366 * 24 * 60 * 60_000) {
        throw new ApiError(400, "Please choose a date within the next year.");
      }
    } else {
      unlockAt = new Date(Date.now() + interval * MINUTE_MS);
    }
    const amountStr = amount.toFixed(7);
    const { heldAsset } = await settingsService.asset();

    await stellarService.ensureUsdcReady(
      recipient.stellarAccount.id,
      recipient.stellarAccount.publicKey,
    );

    const { balanceId, txHash } = await stellarService.openSafetyNet({
      ownerAccountId: wallet.stellarAccount.id,
      ownerPublicKey: wallet.stellarAccount.publicKey,
      recipientPublicKey: recipient.stellarAccount.publicKey,
      amount: amountStr,
      unlockAt,
    });

    const backup = backupRecipientId
      ? await prisma.recipient.findUnique({ where: { id: backupRecipientId } })
      : null;

    const net = await prisma.safetyNet.create({
      data: {
        ownerId,
        walletId: wallet.id,
        recipientId: recipient.id,
        backupRecipientId,
        postReceiptCheckInIntervalMinutes: postReceiptInterval,
        kind,
        label,
        amount: amountStr,
        asset: heldAsset,
        balanceId,
        checkInIntervalMinutes: interval,
        unlockAt,
        lastCheckInAt: new Date(),
        claimCode: makeClaimCode(),
        activity: {
          create: {
            type: ActivityType.CREATED,
            description:
              kind === "GIFT"
                ? backup
                  ? `You sent ${trimAmount(amountStr)} to ${recipient.name}, with ${backup.name} as backup.`
                  : `You sent ${trimAmount(amountStr)} to ${recipient.name}.`
                : backup
                  ? `You set aside ${trimAmount(amountStr)} for ${recipient.name}, with ${backup.name} as backup.`
                  : `You set aside ${trimAmount(amountStr)} for ${recipient.name}.`,
            txHash,
          },
        },
      },
      include: { recipient: true, backupRecipient: true },
    });
    return present(net);
  }

  /** Split one amount across several loved ones in a single Stellar transaction. */
  async createSplit(
    ownerId: string,
    input: {
      label: string;
      checkInIntervalMinutes: number;
      splits: Array<{ recipientId: string; amount: string }>;
    },
  ) {
    const label = input.label.trim();
    if (label.length < 2) throw new ApiError(400, "Please give this a short name.");
    const interval = Math.round(input.checkInIntervalMinutes) || 43200;
    if (!CHECK_IN_INTERVALS.includes(interval)) {
      throw new ApiError(400, "Please choose how often you'll check in.");
    }
    if (input.splits.length < 2) {
      throw new ApiError(400, "Please enter amounts for at least two loved ones.");
    }

    const wallet = await walletService.requireActive(ownerId);
    const unlockAt = new Date(Date.now() + interval * MINUTE_MS);
    const { heldAsset } = await settingsService.asset();

    const resolved = await Promise.all(
      input.splits.map(async (s) => {
        const amount = Number(s.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new ApiError(400, "Please enter a valid amount for each person.");
        }
        const recipient = await recipientService.requireOwned(ownerId, s.recipientId);
        await stellarService.ensureUsdcReady(
          recipient.stellarAccount.id,
          recipient.stellarAccount.publicKey,
        );
        return {
          recipient,
          amountStr: amount.toFixed(7),
        };
      }),
    );

    const { balanceIds, txHash } = await stellarService.openSplitSafetyNets({
      ownerAccountId: wallet.stellarAccount.id,
      ownerPublicKey: wallet.stellarAccount.publicKey,
      splits: resolved.map((r) => ({
        recipientPublicKey: r.recipient.stellarAccount.publicKey,
        amount: r.amountStr,
        unlockAt,
      })),
    });

    const nets = await prisma.$transaction(
      resolved.map((r, i) =>
        prisma.safetyNet.create({
          data: {
            ownerId,
            walletId: wallet.id,
            recipientId: r.recipient.id,
            kind: "SAFETY_NET",
            label: `${label} — ${r.recipient.name}`,
            amount: r.amountStr,
            asset: heldAsset,
            balanceId: balanceIds[i],
            checkInIntervalMinutes: interval,
            unlockAt,
            lastCheckInAt: new Date(),
            claimCode: makeClaimCode(),
            activity: {
              create: {
                type: ActivityType.CREATED,
                description: `You set aside ${trimAmount(r.amountStr)} for ${r.recipient.name} (split fund).`,
                txHash: i === 0 ? txHash : null,
              },
            },
          },
          include: { recipient: true, backupRecipient: true },
        }),
      ),
    );

    return nets.map(present);
  }

  async checkIn(ownerId: string, id: string) {
    const net = await prisma.safetyNet.findFirst({
      where: { id, ownerId },
      include: {
        recipient: { include: { stellarAccount: true } },
        wallet: { include: { stellarAccount: true } },
      },
    });
    if (!net) throw new ApiError(404, "We couldn't find that safety net.");
    if (net.status !== SafetyNetStatus.ACTIVE) {
      throw new ApiError(409, "This safety net can no longer be updated.");
    }
    if (net.kind === "GIFT") {
      throw new ApiError(409, "Gifts don't need check-ins.");
    }
    if (!net.balanceId) throw new ApiError(409, "This safety net isn't ready yet.");

    const newUnlockAt = new Date(Date.now() + net.checkInIntervalMinutes * MINUTE_MS);
    const { balanceId, txHash } = await stellarService.resetSafetyNet({
      ownerAccountId: net.wallet.stellarAccount.id,
      ownerPublicKey: net.wallet.stellarAccount.publicKey,
      recipientPublicKey: net.recipient.stellarAccount.publicKey,
      currentBalanceId: net.balanceId,
      amount: net.amount,
      newUnlockAt,
    });

    const updated = await prisma.safetyNet.update({
      where: { id: net.id },
      data: {
        balanceId,
        unlockAt: newUnlockAt,
        lastCheckInAt: new Date(),
        activity: {
          create: {
            type: ActivityType.CHECKED_IN,
            description: "You checked in. The money stays yours.",
            txHash,
          },
        },
      },
      include: { recipient: true, backupRecipient: true },
    });
    return present(updated);
  }

  async close(ownerId: string, id: string) {
    const net = await prisma.safetyNet.findFirst({
      where: { id, ownerId },
      include: { wallet: { include: { stellarAccount: true } } },
    });
    if (!net) throw new ApiError(404, "We couldn't find that safety net.");
    if (net.status !== SafetyNetStatus.ACTIVE) {
      throw new ApiError(409, "This safety net is already finished.");
    }
    if (!net.balanceId) throw new ApiError(409, "This safety net isn't ready yet.");

    const { txHash } = await stellarService.reclaimToOwner({
      ownerAccountId: net.wallet.stellarAccount.id,
      ownerPublicKey: net.wallet.stellarAccount.publicKey,
      balanceId: net.balanceId,
    });

    const updated = await prisma.safetyNet.update({
      where: { id: net.id },
      data: {
        status: SafetyNetStatus.CLOSED,
        balanceId: null,
        activity: {
          create: {
            type: ActivityType.CLOSED,
            description: `You took back ${trimAmount(net.amount)}.`,
            txHash,
          },
        },
      },
      include: { recipient: true, backupRecipient: true },
    });
    return present(updated);
  }

  // ---- Recipient-facing (by claim code, no login) --------------------------

  private async netByCode(code: string) {
    const net = await prisma.safetyNet.findUnique({
      where: { claimCode: code },
      include: {
        recipient: { include: { stellarAccount: true } },
        backupRecipient: { include: { stellarAccount: true } },
        owner: true,
        activity: {
          where: { type: { in: [ActivityType.RECEIVED, ActivityType.BACKUP_RECEIVED] } },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!net) throw new ApiError(404, "This link doesn't lead to anything.");
    return net;
  }

  async lookupByCode(code: string) {
    const net = await this.netByCode(code);
    const now = Date.now();
    const isOpen = net.status === SafetyNetStatus.ACTIVE && net.unlockAt.getTime() <= now;
    const guardUnlockAt = net.postReceiptUnlockAt?.toISOString() ?? null;
    const guardIsOpen =
      net.status === SafetyNetStatus.GUARDED &&
      guardUnlockAt !== null &&
      Date.parse(guardUnlockAt) <= now;

    return {
      label: net.label,
      amount: net.amount,
      fromName: net.owner.name,
      forName: net.recipient.name,
      backupName: net.backupRecipient?.name ?? null,
      status: net.status,
      isOpen,
      kind: net.kind,
      requestState: net.requestState,
      unlockAt: net.unlockAt.toISOString(),
      receivedTxHash: net.activity[0]?.txHash ?? null,
      hasBackup: Boolean(net.backupRecipientId),
      guardUnlockAt,
      guardIsOpen,
      postReceiptLastCheckInAt: net.postReceiptLastCheckInAt?.toISOString() ?? null,
    };
  }

  async requestEarly(code: string) {
    const net = await prisma.safetyNet.findUnique({ where: { claimCode: code } });
    if (!net) throw new ApiError(404, "This link doesn't lead to anything.");
    if (net.status !== SafetyNetStatus.ACTIVE || net.unlockAt.getTime() <= Date.now()) {
      throw new ApiError(409, "This can't be requested right now.");
    }
    if (net.kind === "GIFT") {
      throw new ApiError(409, "This opens on its own — no need to ask.");
    }
    await prisma.safetyNet.update({ where: { id: net.id }, data: { requestState: "REQUESTED" } });
    return { requested: true };
  }

  async approveEarly(ownerId: string, id: string) {
    const net = await prisma.safetyNet.findFirst({
      where: { id, ownerId },
      include: {
        recipient: { include: { stellarAccount: true } },
        wallet: { include: { stellarAccount: true } },
      },
    });
    if (!net) throw new ApiError(404, "We couldn't find that safety net.");
    if (net.status !== SafetyNetStatus.ACTIVE || !net.balanceId) {
      throw new ApiError(409, "This can no longer be opened.");
    }
    const { balanceId, txHash } = await stellarService.resetSafetyNet({
      ownerAccountId: net.wallet.stellarAccount.id,
      ownerPublicKey: net.wallet.stellarAccount.publicKey,
      recipientPublicKey: net.recipient.stellarAccount.publicKey,
      currentBalanceId: net.balanceId,
      amount: net.amount,
      newUnlockAt: new Date(),
    });
    const updated = await prisma.safetyNet.update({
      where: { id: net.id },
      data: {
        balanceId,
        unlockAt: new Date(),
        requestState: "NONE",
        activity: {
          create: {
            type: ActivityType.OPENED_TO_FAMILY,
            description: `You opened this early for ${net.recipient.name}.`,
            txHash,
          },
        },
      },
      include: { recipient: true, backupRecipient: true },
    });
    return present(updated);
  }

  async dismissEarly(ownerId: string, id: string) {
    const net = await prisma.safetyNet.findFirst({ where: { id, ownerId } });
    if (!net) throw new ApiError(404, "We couldn't find that safety net.");
    await prisma.safetyNet.update({ where: { id: net.id }, data: { requestState: "NONE" } });
    return { ok: true };
  }

  async claimByCode(code: string) {
    const net = await this.netByCode(code);
    if (net.status === SafetyNetStatus.RECEIVED || net.status === SafetyNetStatus.GUARDED) {
      throw new ApiError(409, "This money has already been received.");
    }
    if (net.status === SafetyNetStatus.BACKUP_RECEIVED) {
      throw new ApiError(409, "This money has already been received by the backup.");
    }
    if (net.status !== SafetyNetStatus.ACTIVE) {
      throw new ApiError(409, "This money is no longer available.");
    }
    if (net.unlockAt.getTime() > Date.now()) {
      throw new ApiError(409, "This isn't open yet.");
    }
    if (!net.balanceId) throw new ApiError(409, "This isn't ready yet.");

    await stellarService.ensureUsdcReady(
      net.recipient.stellarAccount.id,
      net.recipient.stellarAccount.publicKey,
    );

    const now = new Date();
    const interval = guardInterval(net);
    const guardUnlockAt = new Date(now.getTime() + interval * MINUTE_MS);

    if (net.backupRecipientId && net.backupRecipient) {
      const { guardBalanceId, txHash } = await stellarService.claimWithGuard({
        recipientAccountId: net.recipient.stellarAccount.id,
        recipientPublicKey: net.recipient.stellarAccount.publicKey,
        backupPublicKey: net.backupRecipient.stellarAccount.publicKey,
        originalBalanceId: net.balanceId,
        amount: net.amount,
        guardUnlockAt,
      });

      await prisma.safetyNet.update({
        where: { id: net.id },
        data: {
          status: SafetyNetStatus.GUARDED,
          balanceId: null,
          postReceiptBalanceId: guardBalanceId,
          postReceiptUnlockAt: guardUnlockAt,
          postReceiptLastCheckInAt: now,
          activity: {
            create: {
              type: ActivityType.RECEIVED,
              description: `${net.recipient.name} received ${trimAmount(net.amount)}. If they can't keep checking in, it goes to ${net.backupRecipient.name}.`,
              txHash,
            },
          },
        },
      });

      return {
        amount: net.amount,
        forName: net.recipient.name,
        backupName: net.backupRecipient.name,
        guarded: true,
        guardUnlockAt: guardUnlockAt.toISOString(),
        txHash,
      };
    }

    const { txHash } = await stellarService.claimToRecipient({
      recipientAccountId: net.recipient.stellarAccount.id,
      recipientPublicKey: net.recipient.stellarAccount.publicKey,
      balanceId: net.balanceId,
    });

    await prisma.safetyNet.update({
      where: { id: net.id },
      data: {
        status: SafetyNetStatus.RECEIVED,
        balanceId: null,
        activity: {
          create: {
            type: ActivityType.RECEIVED,
            description: `${net.recipient.name} received ${trimAmount(net.amount)}.`,
            txHash,
          },
        },
      },
    });

    return { amount: net.amount, forName: net.recipient.name, guarded: false, txHash };
  }

  /** Primary receiver check-in after receipt — keeps funds from opening to backup. */
  async receiverCheckInByCode(code: string) {
    const net = await this.netByCode(code);
    if (net.status !== SafetyNetStatus.GUARDED) {
      throw new ApiError(409, "There's nothing to check in right now.");
    }
    if (!net.postReceiptBalanceId || !net.backupRecipient) {
      throw new ApiError(409, "This isn't ready yet.");
    }

    const interval = guardInterval(net);
    const newUnlockAt = new Date(Date.now() + interval * MINUTE_MS);
    const { guardBalanceId, txHash } = await stellarService.resetGuard({
      recipientAccountId: net.recipient.stellarAccount.id,
      recipientPublicKey: net.recipient.stellarAccount.publicKey,
      backupPublicKey: net.backupRecipient.stellarAccount.publicKey,
      currentBalanceId: net.postReceiptBalanceId,
      amount: net.amount,
      newUnlockAt,
    });

    await prisma.safetyNet.update({
      where: { id: net.id },
      data: {
        postReceiptBalanceId: guardBalanceId,
        postReceiptUnlockAt: newUnlockAt,
        postReceiptLastCheckInAt: new Date(),
        activity: {
          create: {
            type: ActivityType.RECEIVER_CHECKED_IN,
            description: `${net.recipient.name} checked in. The money stays theirs.`,
            txHash,
          },
        },
      },
    });

    return {
      guardUnlockAt: newUnlockAt.toISOString(),
      backupName: net.backupRecipient.name,
      txHash,
    };
  }

  /** Backup beneficiary receives when the primary receiver stops checking in. */
  async backupClaimByCode(code: string) {
    const net = await this.netByCode(code);
    if (net.status !== SafetyNetStatus.GUARDED) {
      throw new ApiError(409, "This isn't available to the backup right now.");
    }
    if (!net.backupRecipient || !net.postReceiptBalanceId || !net.postReceiptUnlockAt) {
      throw new ApiError(409, "This isn't ready yet.");
    }
    if (net.postReceiptUnlockAt.getTime() > Date.now()) {
      throw new ApiError(409, "This isn't open to the backup yet.");
    }

    const { txHash } = await stellarService.claimGuardAsBackup({
      backupAccountId: net.backupRecipient.stellarAccount.id,
      backupPublicKey: net.backupRecipient.stellarAccount.publicKey,
      guardBalanceId: net.postReceiptBalanceId,
    });

    await prisma.safetyNet.update({
      where: { id: net.id },
      data: {
        status: SafetyNetStatus.BACKUP_RECEIVED,
        postReceiptBalanceId: null,
        activity: {
          create: {
            type: ActivityType.BACKUP_RECEIVED,
            description: `${net.backupRecipient.name} received ${trimAmount(net.amount)} after ${net.recipient.name} couldn't check in.`,
            txHash,
          },
        },
      },
    });

    return {
      amount: net.amount,
      forName: net.backupRecipient.name,
      primaryName: net.recipient.name,
      txHash,
    };
  }
}

function trimAmount(amount: string): string {
  const n = Number(amount);
  return Number.isInteger(n) ? n.toString() : n.toString();
}

export const safetyNetService = new SafetyNetService();
