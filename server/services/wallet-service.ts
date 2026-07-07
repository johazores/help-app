import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { stellarService } from "@/server/services/stellar-service";

const MAX_TEST_TOPUP = 1000;

class WalletService {
  private async accountFor(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { stellarAccount: true },
    });
    if (!user?.stellarAccount) throw new ApiError(400, "Your account isn't ready yet.");
    return user.stellarAccount;
  }

  async depositInfo(userId: string) {
    const account = await this.accountFor(userId);
    const balance = await stellarService.availableBalance(account.publicKey);
    return { address: account.publicKey, balance };
  }

  async addTestFunds(userId: string, amount: number) {
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_TEST_TOPUP) {
      throw new ApiError(400, `Please choose an amount between 1 and ${MAX_TEST_TOPUP}.`);
    }
    const account = await this.accountFor(userId);
    const { txHash } = await stellarService.addTestFunds(account.publicKey, amount.toFixed(7));
    const balance = await stellarService.availableBalance(account.publicKey);
    return { balance, txHash };
  }
}

export const walletService = new WalletService();
