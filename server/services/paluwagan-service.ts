import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { verifyPin } from "@/lib/crypto";
import { stellarService } from "@/server/services/stellar-service";
import { walletService } from "@/server/services/wallet-service";

const MINUTE_MS = 60_000;
const MIN_MEMBERS = 2; // spec recommends 3+; 2 allowed so testnet demos are practical
const MAX_MEMBERS = 12;
const MAX_AMOUNT = 100000;
const FREQUENCIES = [1, 10080, 43200]; // testing | weekly | monthly

interface MemberRow {
  id: string;
  userId: string;
  name: string;
  role: string;
  payoutPosition: number;
  walletId: string;
}

/**
 * Paluwagan (savings circle) MVP core, per PALUWAGAN.md.
 * Design choice: NO pooled wallet. Each cycle, members pay the cycle's
 * recipient directly — the "payout" is complete the moment everyone has paid.
 * Rules lock at start; payout order is join order.
 */
class PaluwaganService {
  private async requirePinOf(userId: string, pin: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !verifyPin(pin, user.pinHash)) {
      throw new ApiError(401, "Your PIN doesn't match.");
    }
  }

  async listMine(userId: string) {
    const memberships = await prisma.paluwaganMember.findMany({
      where: { userId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            status: true,
            contributionAmount: true,
            frequencyMinutes: true,
            currentCycle: true,
            inviteCode: true,
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });
    return memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      status: m.group.status,
      amount: m.group.contributionAmount,
      frequencyMinutes: m.group.frequencyMinutes,
      currentCycle: m.group.currentCycle,
      memberCount: m.group._count.members,
      inviteCode: m.group.inviteCode,
      myRole: m.role,
    }));
  }

  async create(userId: string, input: { name: string; amount: string; frequencyMinutes: number; pin: string }) {
    await this.requirePinOf(userId, input.pin);
    const name = input.name.trim().slice(0, 40);
    if (name.length < 2) throw new ApiError(400, "Please name your paluwagan.");
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
      throw new ApiError(400, `Please enter an amount between 1 and ${MAX_AMOUNT}.`);
    }
    if (!FREQUENCIES.includes(input.frequencyMinutes)) {
      throw new ApiError(400, "Please choose weekly or monthly.");
    }
    const owner = await prisma.user.findUnique({ where: { id: userId } });
    const wallet = await walletService.requireActive(userId);

    const group = await prisma.paluwaganGroup.create({
      data: {
        name,
        ownerId: userId,
        contributionAmount: amount.toFixed(7),
        frequencyMinutes: input.frequencyMinutes,
        inviteCode: randomBytes(6).toString("base64url").slice(0, 8),
        members: {
          create: {
            userId,
            name: owner?.name ?? "Owner",
            role: "OWNER",
            payoutPosition: 1,
            walletId: wallet.id,
          },
        },
      },
    });
    return { id: group.id, inviteCode: group.inviteCode };
  }

  /** Public invite summary (no login needed to look). */
  async inviteSummary(code: string) {
    const group = await prisma.paluwaganGroup.findUnique({
      where: { inviteCode: code },
      include: { members: { orderBy: { payoutPosition: "asc" } } },
    });
    if (!group) throw new ApiError(404, "This invite doesn't lead to anything.");
    const owner = group.members.find((m: MemberRow) => m.role === "OWNER");
    return {
      name: group.name,
      ownerName: owner?.name ?? "",
      amount: group.contributionAmount,
      frequencyMinutes: group.frequencyMinutes,
      memberCount: group.members.length,
      maxMembers: MAX_MEMBERS,
      status: group.status,
      yourPositionIfJoined: group.members.length + 1,
    };
  }

  async join(userId: string, code: string, pin: string) {
    await this.requirePinOf(userId, pin);
    const group = await prisma.paluwaganGroup.findUnique({
      where: { inviteCode: code },
      include: { members: true },
    });
    if (!group) throw new ApiError(404, "This invite doesn't lead to anything.");
    if (group.status !== "DRAFT") throw new ApiError(409, "This paluwagan has already started.");
    if (group.members.length >= MAX_MEMBERS) throw new ApiError(409, "This paluwagan is full.");
    if (group.members.some((m: MemberRow) => m.userId === userId)) {
      throw new ApiError(409, "You're already in this paluwagan.");
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const wallet = await walletService.requireActive(userId);
    await prisma.paluwaganMember.create({
      data: {
        groupId: group.id,
        userId,
        name: user?.name ?? "Member",
        payoutPosition: group.members.length + 1,
        walletId: wallet.id,
      },
    });
    return { id: group.id };
  }

  /** Owner starts the group: rules lock, all cycles are generated up front. */
  async start(userId: string, groupId: string, pin: string) {
    await this.requirePinOf(userId, pin);
    const group = await prisma.paluwaganGroup.findFirst({
      where: { id: groupId, ownerId: userId },
      include: { members: { orderBy: { payoutPosition: "asc" } } },
    });
    if (!group) throw new ApiError(404, "We couldn't find that paluwagan.");
    if (group.status !== "DRAFT") throw new ApiError(409, "This has already started.");
    if (group.members.length < MIN_MEMBERS) {
      throw new ApiError(400, `You need at least ${MIN_MEMBERS} members to start (3 or more is best).`);
    }
    const now = Date.now();
    await prisma.$transaction([
      ...group.members.map((m: MemberRow, i: number) =>
        prisma.paluwaganCycle.create({
          data: {
            groupId: group.id,
            cycleNumber: i + 1,
            dueAt: new Date(now + (i + 1) * group.frequencyMinutes * MINUTE_MS),
            payoutMemberId: m.id,
            status: i === 0 ? "COLLECTING" : "UPCOMING",
          },
        }),
      ),
      prisma.paluwaganGroup.update({
        where: { id: group.id },
        data: { status: "ACTIVE", currentCycle: 1, startedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }

  async detail(userId: string, groupId: string) {
    const group = await prisma.paluwaganGroup.findUnique({
      where: { id: groupId },
      include: {
        members: { orderBy: { payoutPosition: "asc" } },
        cycles: { orderBy: { cycleNumber: "asc" }, include: { contributions: true } },
      },
    });
    if (!group) throw new ApiError(404, "We couldn't find that paluwagan.");
    const me = group.members.find((m: MemberRow) => m.userId === userId);
    if (!me) throw new ApiError(403, "You're not part of this paluwagan.");

    type ContribRow = { memberId: string; status: string; txHash: string | null; paidAt: Date | null };
    type CycleRow = { id: string; cycleNumber: number; dueAt: Date; payoutMemberId: string; status: string; contributions: ContribRow[] };

    const cycles = group.cycles.map((c: CycleRow) => {
      const recipient = group.members.find((m: MemberRow) => m.id === c.payoutMemberId);
      const payers = group.members.filter((m: MemberRow) => m.id !== c.payoutMemberId);
      return {
        id: c.id,
        cycleNumber: c.cycleNumber,
        dueAt: c.dueAt.toISOString(),
        status: c.status,
        recipientName: recipient?.name ?? "",
        recipientIsMe: recipient?.userId === userId,
        paid: payers.map((m: MemberRow) => ({
          memberName: m.name,
          isMe: m.userId === userId,
          status: c.contributions.find((x: ContribRow) => x.memberId === m.id)?.status ?? "DUE",
        })),
      };
    });

    return {
      id: group.id,
      name: group.name,
      status: group.status,
      amount: group.contributionAmount,
      frequencyMinutes: group.frequencyMinutes,
      currentCycle: group.currentCycle,
      inviteCode: group.inviteCode,
      iAmOwner: me.role === "OWNER",
      memberCount: group.members.length,
      members: group.members.map((m: MemberRow) => ({
        name: m.name,
        position: m.payoutPosition,
        isMe: m.userId === userId,
        isOwner: m.role === "OWNER",
      })),
      cycles,
    };
  }

  /** Member pays this cycle's recipient directly. Rotates when everyone has paid. */
  async contribute(userId: string, groupId: string, pin: string) {
    await this.requirePinOf(userId, pin);
    const group = await prisma.paluwaganGroup.findUnique({
      where: { id: groupId },
      include: { members: true, cycles: { where: { status: "COLLECTING" } } },
    });
    if (!group || group.status !== "ACTIVE") throw new ApiError(409, "This paluwagan isn't collecting right now.");
    const me = group.members.find((m: MemberRow) => m.userId === userId);
    if (!me) throw new ApiError(403, "You're not part of this paluwagan.");
    const cycle = group.cycles[0];
    if (!cycle) throw new ApiError(409, "There's nothing due right now.");
    if (cycle.payoutMemberId === me.id) {
      throw new ApiError(409, "It's your turn to receive this round — nothing to pay.");
    }
    const existing = await prisma.paluwaganContribution.findUnique({
      where: { cycleId_memberId: { cycleId: cycle.id, memberId: me.id } },
    });
    if (existing?.status === "PAID") throw new ApiError(409, "You've already paid this round.");

    // Pay the recipient directly, wallet to wallet.
    const recipient = group.members.find((m: MemberRow) => m.id === cycle.payoutMemberId)!;
    const myWallet = await prisma.wallet.findUnique({
      where: { id: me.walletId },
      include: { stellarAccount: true },
    });
    const theirWallet = await prisma.wallet.findUnique({
      where: { id: recipient.walletId },
      include: { stellarAccount: true },
    });
    if (!myWallet || !theirWallet) throw new ApiError(409, "A wallet in this group is missing.");

    const { txHash } = await stellarService.pay({
      fromAccountId: myWallet.stellarAccount.id,
      fromPublicKey: myWallet.stellarAccount.publicKey,
      toPublicKey: theirWallet.stellarAccount.publicKey,
      amount: group.contributionAmount,
    });

    await prisma.paluwaganContribution.upsert({
      where: { cycleId_memberId: { cycleId: cycle.id, memberId: me.id } },
      update: { status: "PAID", paidAt: new Date(), txHash },
      create: {
        cycleId: cycle.id,
        memberId: me.id,
        amount: group.contributionAmount,
        status: "PAID",
        paidAt: new Date(),
        txHash,
      },
    });

    // Rotate if everyone (except the recipient) has now paid.
    const payersCount = group.members.length - 1;
    const paidCount = await prisma.paluwaganContribution.count({
      where: { cycleId: cycle.id, status: "PAID" },
    });
    if (paidCount >= payersCount) {
      const next = await prisma.paluwaganCycle.findUnique({
        where: { groupId_cycleNumber: { groupId: group.id, cycleNumber: cycle.cycleNumber + 1 } },
      });
      await prisma.$transaction([
        prisma.paluwaganCycle.update({ where: { id: cycle.id }, data: { status: "PAID_OUT" } }),
        ...(next
          ? [
              prisma.paluwaganCycle.update({ where: { id: next.id }, data: { status: "COLLECTING" } }),
              prisma.paluwaganGroup.update({ where: { id: group.id }, data: { currentCycle: next.cycleNumber } }),
            ]
          : [prisma.paluwaganGroup.update({ where: { id: group.id }, data: { status: "COMPLETED" } })]),
      ]);
    }
    return { txHash };
  }
}

export const paluwaganService = new PaluwaganService();
