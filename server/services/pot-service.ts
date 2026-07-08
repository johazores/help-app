import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";

/** Savings goals — earmarks of wallet funds toward a target. */
class PotService {
  async list(userId: string) {
    const pots = await prisma.pot.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
    return pots.map((p: { id: string; name: string; target: string; saved: string }) => ({
      id: p.id,
      name: p.name,
      target: p.target,
      saved: p.saved,
    }));
  }

  async create(userId: string, name: string, target: string) {
    const trimmed = name.trim().slice(0, 40);
    const targetNum = Number(target);
    if (trimmed.length < 2) throw new ApiError(400, "Please name your goal.");
    if (!Number.isFinite(targetNum) || targetNum <= 0) {
      throw new ApiError(400, "Please enter a target amount.");
    }
    const pot = await prisma.pot.create({
      data: { userId, name: trimmed, target: targetNum.toFixed(2) },
    });
    return { id: pot.id, name: pot.name, target: pot.target, saved: pot.saved };
  }

  async addTo(userId: string, potId: string, amount: string) {
    const add = Number(amount);
    if (!Number.isFinite(add) || add <= 0) throw new ApiError(400, "Please enter an amount.");
    const pot = await prisma.pot.findFirst({ where: { id: potId, userId } });
    if (!pot) throw new ApiError(404, "That goal wasn't found.");
    const saved = (Number(pot.saved) + add).toFixed(2);
    await prisma.pot.update({ where: { id: potId }, data: { saved } });
    return { saved };
  }

  async remove(userId: string, potId: string) {
    const pot = await prisma.pot.findFirst({ where: { id: potId, userId } });
    if (!pot) throw new ApiError(404, "That goal wasn't found.");
    await prisma.pot.delete({ where: { id: potId } });
    return { ok: true };
  }
}

export const potService = new PotService();
