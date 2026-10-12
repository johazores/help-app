import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { SafetyNetStatus } from "@prisma/client";
import { normalizePhone, text } from "@/lib/validation";
import { stellarService } from "@/server/services/stellar-service";

const MAX_RECIPIENTS = 50;

class RecipientService {
  async list(ownerId: string) {
    const recipients = await prisma.recipient.findMany({
      where: { ownerId },
      orderBy: { createdAt: "asc" },
    });
    return recipients.map(
      (r: { id: string; name: string; relationship: string; phone: string | null }) => ({
        id: r.id,
        name: r.name,
        relationship: r.relationship,
        phone: r.phone,
      }),
    );
  }

  async create(ownerId: string, input: { name: unknown; relationship: unknown; phone?: unknown }) {
    const name = text(input.name).slice(0, 60);
    const relationship = text(input.relationship).slice(0, 40);
    if (name.length < 2) throw new ApiError(400, "Please enter their name.");
    if (relationship.length < 2) throw new ApiError(400, "Please say how they're related to you.");
    const phone = text(input.phone) ? normalizePhone(input.phone) : null;

    const count = await prisma.recipient.count({ where: { ownerId } });
    if (count >= MAX_RECIPIENTS) {
      throw new ApiError(400, `You can add up to ${MAX_RECIPIENTS} loved ones.`);
    }

    // Each loved one gets a funded custodial account so they can receive
    // money without ever managing anything technical.
    const account = await stellarService.createFundedAccount();

    const recipient = await prisma.recipient.create({
      data: {
        ownerId,
        name,
        relationship,
        phone,
        stellarAccountId: account.id,
      },
    });
    return {
      id: recipient.id,
      name: recipient.name,
      relationship: recipient.relationship,
      phone: recipient.phone,
    };
  }

  async requireOwned(ownerId: string, recipientId: string) {
    const recipient = await prisma.recipient.findFirst({
      where: { id: recipientId, ownerId },
      include: { stellarAccount: true },
    });
    if (!recipient) throw new ApiError(404, "We couldn't find that person.");
    return recipient;
  }

  /**
   * Public recovery: claim links for a loved one's mobile number, limited to
   * safety nets set aside by the sender whose mobile number is also given.
   */
  async findClaimLinks(phone: string, senderPhone: string) {
    const nets = await prisma.safetyNet.findMany({
      where: {
        recipient: { phone },
        owner: { phone: senderPhone },
        status: {
          in: [
            SafetyNetStatus.ACTIVE,
            SafetyNetStatus.GUARDED,
            SafetyNetStatus.RECEIVED,
            SafetyNetStatus.BACKUP_RECEIVED,
          ],
        },
      },
      include: { recipient: true, owner: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    return nets.map((n) => ({
      label: n.label,
      fromName: n.owner.name,
      forName: n.recipient.name,
      amount: n.amount,
      status: n.status,
      claimCode: n.claimCode,
      isOpen: n.status === SafetyNetStatus.ACTIVE && n.unlockAt.getTime() <= Date.now(),
    }));
  }
}

export const recipientService = new RecipientService();
