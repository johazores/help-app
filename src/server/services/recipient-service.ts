import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
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

    // Each loved one gets a funded custodial account so they can receive
    // money without ever managing anything technical.
    const account = await stellarService.createFundedAccount();

    const recipient = await prisma.recipient.create({
      data: {
        ownerId,
        name,
        relationship,
        phone: input.phone?.trim() || null,
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
}

export const recipientService = new RecipientService();
