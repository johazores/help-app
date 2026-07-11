import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { SafetyNetStatus } from "@prisma/client";
import { stellarService } from "@/server/services/stellar-service";

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

  async create(ownerId: string, input: { name: string; relationship: string; phone?: string }) {
    const name = input.name.trim();
    const relationship = input.relationship.trim();
    if (name.length < 2) throw new ApiError(400, "Please enter their name.");
    if (relationship.length < 2) throw new ApiError(400, "Please say how they're related to you.");

    let phone: string | null = null;
    if (input.phone?.trim()) {
      const digits = input.phone.replace(/[\s-]/g, "");
      if (!/^(\+?63|0)?9\d{9}$/.test(digits)) {
        throw new ApiError(400, "Please enter a valid mobile number.");
      }
      phone = digits.replace(/^\+?63/, "0").replace(/^(?!0)/, "0");
      if (!phone.startsWith("0")) phone = `0${phone}`;
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

  /** Public recovery: find claim links for a loved one's mobile number. */
  async findClaimLinksByPhone(phoneInput: string) {
    const digits = phoneInput.replace(/[\s-]/g, "");
    if (!/^(\+?63|0)?9\d{9}$/.test(digits)) {
      throw new ApiError(400, "Please enter a valid mobile number.");
    }
    const phone = digits.replace(/^\+?63/, "0").replace(/^(?!0)/, "0");
    const normalized = phone.startsWith("0") ? phone : `0${phone}`;

    const nets = await prisma.safetyNet.findMany({
      where: {
        recipient: { phone: normalized },
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
    });

    return nets.map((n) => ({
      label: n.label,
      fromName: n.owner.name,
      forName: n.recipient.name,
      amount: n.amount,
      status: n.status,
      claimCode: n.claimCode,
      isOpen: n.status === "ACTIVE" && n.unlockAt.getTime() <= Date.now(),
    }));
  }
}

export const recipientService = new RecipientService();
