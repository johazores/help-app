import { randomBytes } from "node:crypto";
import { ActivityType, SafetyNetStatus, type SafetyNet } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { stellarService } from "@/server/services/stellar-service";
import { recipientService } from "@/server/services/recipient-service";
import { walletService } from "@/server/services/wallet-service";

const MINUTE_MS = 60 * 1000;

function makeClaimCode(): string {
  // 8 URL-safe characters — short enough to hand to a family member.
  return randomBytes(6).toString("base64url").slice(0, 8);
}

/** Shape sent to the UI. Contains no technical terms. */
function present(net: SafetyNet & { recipient: { name: string; relationship: string } }) {
  const now = Date.now();
  const isOpen =
    net.status === SafetyNetStatus.ACTIVE && net.unlockAt.getTime() <= now;
  return {
    id: net.id,
    kind: (net as { kind?: string }).kind ?? "SAFETY_NET",
    requestState: (net as { requestState?: string }).requestState ?? "NONE",
    label: net.label,
    amount: net.amount,
    forName: net.recipient.name,
    forRelationship: net.recipient.relationship,
    checkInIntervalMinutes: net.checkInIntervalMinutes,
    unlockAt: net.unlockAt.toISOString(),
    lastCheckInAt: net.lastCheckInAt.toISOString(),
    claimCode: net.claimCode,
    status: net.status,
    isOpen,
    createdAt: net.createdAt.toISOString(),
  };
}

class SafetyNetService {
  async list(ownerId: string) {
    const nets = await prisma.safetyNet.findMany({
      where: { ownerId },
      include: { recipient: true },
      orderBy: { createdAt: "desc" },
    });
    return nets.map(present);
  }

  async detail(ownerId: string, id: string) {
    const net = await prisma.safetyNet.findFirst({
      where: { id, ownerId },
      include: { recipient: true, activity: { orderBy: { createdAt: "desc" } } },
    });
    if (!net) throw new ApiError(404, "We couldn't find that safety net.");
    return {
      ...present(net),
      activity: net.activity.map(
        (a: {
          id: string;
          type: ActivityType;
          description: string;
          txHash: string | null;
          createdAt: Date;
        }) => ({
          id: a.id,
          type: a.type,
          description: a.description,
          txHash: a.txHash,
          createdAt: a.createdAt.toISOString(),
        }),
      ),
    };
  }

  async create(
    ownerId: string,
    input: {
      label: string;
      amount: string;
      recipientId: string;
      checkInIntervalMinutes: number;
      kind?: string;
      opensAt?: string; // for gifts: ISO date (or omitted = opens now)
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
    if (kind === "SAFETY_NET" && ![1, 10080, 43200, 129600].includes(interval)) {
      throw new ApiError(400, "Please choose how often you'll check in.");
    }

    const wallet = await walletService.requireActive(ownerId);
    const recipient = await recipientService.requireOwned(ownerId, input.recipientId);

    let unlockAt: Date;
    if (kind === "GIFT") {
      unlockAt = input.opensAt ? new Date(input.opensAt) : new Date();
      if (Number.isNaN(unlockAt.getTime())) throw new ApiError(400, "Please choose a valid date.");
      if (unlockAt.getTime() > Date.now() + 366 * 24 * 60 * 60_000) {
        throw new ApiError(400, "Please choose a date within the next year.");
      }
    } else {
      unlockAt = new Date(Date.now() + interval * MINUTE_MS);
    }
    const amountStr = amount.toFixed(7);

    const { balanceId, txHash } = await stellarService.openSafetyNet({
      ownerAccountId: wallet.stellarAccount.id,
      ownerPublicKey: wallet.stellarAccount.publicKey,
      recipientPublicKey: recipient.stellarAccount.publicKey,
      amount: amountStr,
      unlockAt,
    });

    const net = await prisma.safetyNet.create({
      data: {
        ownerId,
        walletId: wallet.id,
        recipientId: recipient.id,
        kind,
        label,
        amount: amountStr,
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
                ? `You sent ${trimAmount(amountStr)} to ${recipient.name}.`
                : `You set aside ${trimAmount(amountStr)} for ${recipient.name}.`,
            txHash,
          },
        },
      },
      include: { recipient: true },
    });
    return present(net);
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
    if ((net as { kind?: string }).kind === "GIFT") {
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
      include: { recipient: true },
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
      include: { recipient: true },
    });
    return present(updated);
  }

  // ---- Recipient-facing (by claim code, no login) --------------------------

  async lookupByCode(code: string) {
    const net = await prisma.safetyNet.findUnique({
      where: { claimCode: code },
      include: {
        recipient: true,
        owner: true,
        activity: { where: { type: ActivityType.RECEIVED }, take: 1 },
      },
    });
    if (!net) throw new ApiError(404, "This link doesn't lead to anything.");
    const now = Date.now();
    const isOpen = net.status === SafetyNetStatus.ACTIVE && net.unlockAt.getTime() <= now;
    return {
      label: net.label,
      amount: net.amount,
      fromName: net.owner.name,
      forName: net.recipient.name,
      status: net.status,
      isOpen,
      kind: (net as { kind?: string }).kind ?? "SAFETY_NET",
      requestState: (net as { requestState?: string }).requestState ?? "NONE",
      unlockAt: net.unlockAt.toISOString(),
      receivedTxHash: net.activity[0]?.txHash ?? null,
    };
  }

  /** Family asks to open a safety net early (via the claim link). */
  async requestEarly(code: string) {
    const net = await prisma.safetyNet.findUnique({ where: { claimCode: code } });
    if (!net) throw new ApiError(404, "This link doesn't lead to anything.");
    if (net.status !== SafetyNetStatus.ACTIVE || net.unlockAt.getTime() <= Date.now()) {
      throw new ApiError(409, "This can't be requested right now.");
    }
    if ((net as { kind?: string }).kind === "GIFT") {
      throw new ApiError(409, "This opens on its own — no need to ask.");
    }
    await prisma.safetyNet.update({ where: { id: net.id }, data: { requestState: "REQUESTED" } });
    return { requested: true };
  }

  /** Owner approves an early-open request: the money opens to family right away. */
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
      include: { recipient: true },
    });
    return present(updated);
  }

  /** Owner dismisses an early-open request. */
  async dismissEarly(ownerId: string, id: string) {
    const net = await prisma.safetyNet.findFirst({ where: { id, ownerId } });
    if (!net) throw new ApiError(404, "We couldn't find that safety net.");
    await prisma.safetyNet.update({ where: { id: net.id }, data: { requestState: "NONE" } });
    return { ok: true };
  }

  async claimByCode(code: string) {
    const net = await prisma.safetyNet.findUnique({
      where: { claimCode: code },
      include: { recipient: { include: { stellarAccount: true } } },
    });
    if (!net) throw new ApiError(404, "This link doesn't lead to anything.");
    if (net.status === SafetyNetStatus.RECEIVED) {
      throw new ApiError(409, "This money has already been received.");
    }
    if (net.status !== SafetyNetStatus.ACTIVE) {
      throw new ApiError(409, "This money is no longer available.");
    }
    if (net.unlockAt.getTime() > Date.now()) {
      throw new ApiError(409, "This isn't open yet.");
    }
    if (!net.balanceId) throw new ApiError(409, "This isn't ready yet.");

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

    return { amount: net.amount, forName: net.recipient.name, txHash };
  }
}

function trimAmount(amount: string): string {
  const n = Number(amount);
  return Number.isInteger(n) ? n.toString() : n.toString();
}

export const safetyNetService = new SafetyNetService();
