import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { verifyPin } from "@/lib/crypto";
import { settingsService } from "@/server/services/settings-service";
import { stellarService } from "@/server/services/stellar-service";

const MAX_TEST_TOPUP = 1000;
const MAX_WALLETS = 10;

/** Everything about a person's wallets: create, import, switch, rename, reveal. */
class WalletService {
  private present(w: {
    id: string;
    name: string;
    imported: boolean;
    createdAt: Date;
    stellarAccount: { publicKey: string };
  }, activeWalletId: string | null) {
    return {
      id: w.id,
      name: w.name,
      imported: w.imported,
      address: w.stellarAccount.publicKey,
      active: w.id === activeWalletId,
      createdAt: w.createdAt.toISOString(),
    };
  }

  async list(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallets: { include: { stellarAccount: true }, orderBy: { createdAt: "asc" } } },
    });
    if (!user) throw new ApiError(404, "Account not found.");
    return user.wallets.map(
      (w: { id: string; name: string; imported: boolean; createdAt: Date; stellarAccount: { publicKey: string } }) =>
        this.present(w, user.activeWalletId),
    );
  }

  /** The wallet money actions currently use. Ensures USDC trustline when needed. */
  async requireActive(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallets: { include: { stellarAccount: true } } },
    });
    if (!user) throw new ApiError(404, "Account not found.");
    const active =
      user.wallets.find((w: { id: string }) => w.id === user.activeWalletId) ?? user.wallets[0] ?? null;
    if (!active) throw new ApiError(409, "You don't have a wallet yet. Please set one up first.");
    await stellarService.ensureUsdcReady(active.stellarAccount.id, active.stellarAccount.publicKey);
    return active;
  }

  private async nextDefaultName(userId: string): Promise<string> {
    const count = await prisma.wallet.count({ where: { userId } });
    return count === 0 ? "My wallet" : `Wallet ${count + 1}`;
  }

  private async guardLimit(userId: string) {
    const count = await prisma.wallet.count({ where: { userId } });
    if (count >= MAX_WALLETS) {
      throw new ApiError(400, `You can have up to ${MAX_WALLETS} wallets.`);
    }
  }

  /** Creates a brand-new wallet and returns the one-time recovery key. */
  async create(userId: string, nameInput?: string) {
    await this.guardLimit(userId);
    const name = (nameInput?.trim() || (await this.nextDefaultName(userId))).slice(0, 40);

    const account = await stellarService.createFundedAccount();
    const wallet = await prisma.wallet.create({
      data: { userId, name, stellarAccountId: account.id },
      include: { stellarAccount: true },
    });
    await this.makeActive(userId, wallet.id);

    // One-time reveal at creation; afterwards it requires the PIN.
    const recoveryKey = await stellarService.revealSecret(account.id);
    return { wallet: this.present(wallet, wallet.id), recoveryKey };
  }

  /** Imports a wallet from the user's own recovery (secret) key. */
  async import(userId: string, secretKey: string, nameInput?: string) {
    await this.guardLimit(userId);
    if (!secretKey?.trim()) {
      throw new ApiError(400, "Please paste your recovery key.");
    }
    const name = (nameInput?.trim() || (await this.nextDefaultName(userId))).slice(0, 40);

    const account = await stellarService.importAccount(secretKey);
    const wallet = await prisma.wallet.create({
      data: { userId, name, imported: true, stellarAccountId: account.id },
      include: { stellarAccount: true },
    });
    await this.makeActive(userId, wallet.id);
    return { wallet: this.present(wallet, wallet.id) };
  }

  async rename(userId: string, walletId: string, nameInput: string) {
    const name = nameInput.trim().slice(0, 40);
    if (name.length < 1) throw new ApiError(400, "Please enter a wallet name.");
    const wallet = await prisma.wallet.findFirst({ where: { id: walletId, userId } });
    if (!wallet) throw new ApiError(404, "That wallet wasn't found.");
    await prisma.wallet.update({ where: { id: walletId }, data: { name } });
    return { ok: true };
  }

  async makeActive(userId: string, walletId: string) {
    const wallet = await prisma.wallet.findFirst({ where: { id: walletId, userId } });
    if (!wallet) throw new ApiError(404, "That wallet wasn't found.");
    await prisma.user.update({ where: { id: userId }, data: { activeWalletId: walletId } });
    return { ok: true };
  }

  /** PIN-guarded backup of the recovery key. */
  async reveal(userId: string, walletId: string, pin: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !verifyPin(pin, user.pinHash)) {
      throw new ApiError(401, "Your PIN doesn't match.");
    }
    const wallet = await prisma.wallet.findFirst({ where: { id: walletId, userId } });
    if (!wallet) throw new ApiError(404, "That wallet wasn't found.");
    const recoveryKey = await stellarService.revealSecret(wallet.stellarAccountId);
    return { recoveryKey };
  }

  // ---- Funding (active wallet) ----------------------------------------------

  async depositInfo(userId: string) {
    const active = await this.requireActive(userId);
    const balance = await stellarService.availableBalance(active.stellarAccount.publicKey);
    return { address: active.stellarAccount.publicKey, balance, walletName: active.name };
  }

  async addTestFunds(userId: string, amount: number) {
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_TEST_TOPUP) {
      throw new ApiError(400, `Please choose an amount between 1 and ${MAX_TEST_TOPUP}.`);
    }

    const funding = await settingsService.ensureTestFundingReady();
    const active = await this.requireActive(userId);
    const { txHash } = await stellarService.addTestFunds(
      active.stellarAccount.publicKey,
      amount.toFixed(7),
    );
    const [balance, asset] = await Promise.all([
      stellarService.availableBalance(active.stellarAccount.publicKey),
      settingsService.asset(),
    ]);

    return {
      balance,
      txHash,
      asset: asset.heldAsset,
      switchedAsset: funding.switchedToXlm,
    };
  }
}

export const walletService = new WalletService();