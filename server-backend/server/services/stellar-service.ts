import {
  Asset,
  BASE_FEE,
  Claimant,
  Horizon,
  Keypair,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { settingsService } from "@/server/services/settings-service";

/**
 * The only place that talks to Stellar. Everything is classic-layer:
 * claimable balances + native time predicates. No smart contracts.
 *
 * Held asset defaults to USDC on testnet (stable savings); XLM is kept only
 * for network fees. Configure via Setting table (see prisma/seed.ts).
 */

const WELCOME_USDC = "10000.0000000";
const BALANCE_CACHE_MS = 20_000;

async function server(): Promise<Horizon.Server> {
  const { horizonUrl } = await settingsService.stellar();
  return new Horizon.Server(horizonUrl);
}

export interface StoredAccount {
  id: string;
  publicKey: string;
}

class StellarService {
  private balanceCache = new Map<string, { balance: string; at: number }>();

  /** The asset safety nets and balances use (USDC in production-shaped testnet). */
  async heldAsset(): Promise<Asset> {
    const cfg = await settingsService.asset();
    if (cfg.heldAsset === "USDC") {
      return new Asset(cfg.usdcCode, cfg.usdcIssuer);
    }
    return Asset.native();
  }

  private async loadKeypair(stellarAccountId: string): Promise<Keypair> {
    const account = await prisma.stellarAccount.findUnique({ where: { id: stellarAccountId } });
    if (!account) throw new ApiError(404, "Account not found.");
    const secret = decryptSecret({
      cipherText: account.encryptedSecret,
      iv: account.encryptionIv,
      tag: account.encryptionTag,
    });
    return Keypair.fromSecret(secret);
  }

  /** Creates a keypair, funds it via Friendbot (testnet), and stores it encrypted. */
  async createFundedAccount(): Promise<StoredAccount> {
    const { friendbotUrl } = await settingsService.stellar();
    const keypair = Keypair.random();

    const res = await fetch(`${friendbotUrl}?addr=${encodeURIComponent(keypair.publicKey())}`);
    if (!res.ok) {
      throw new ApiError(502, "We couldn't set up the account right now. Please try again.");
    }

    const enc = encryptSecret(keypair.secret());
    const account = await prisma.stellarAccount.create({
      data: {
        publicKey: keypair.publicKey(),
        encryptedSecret: enc.cipherText,
        encryptionIv: enc.iv,
        encryptionTag: enc.tag,
      },
    });

    await this.ensureUsdcReady(account.id, account.publicKey);
    await this.sendWelcomeFunds(account.publicKey);

    return { id: account.id, publicKey: account.publicKey };
  }

  async importAccount(secretKey: string): Promise<StoredAccount> {
    let keypair: Keypair;
    try {
      keypair = Keypair.fromSecret(secretKey.trim());
    } catch {
      throw new ApiError(400, "That doesn't look like a valid recovery key. It starts with S and has 56 characters.");
    }

    const existing = await prisma.stellarAccount.findUnique({
      where: { publicKey: keypair.publicKey() },
    });
    if (existing) {
      throw new ApiError(409, "That wallet is already set up in Sagip.");
    }

    const svr = await server();
    try {
      await svr.loadAccount(keypair.publicKey());
    } catch {
      const { friendbotUrl } = await settingsService.stellar();
      const res = await fetch(`${friendbotUrl}?addr=${encodeURIComponent(keypair.publicKey())}`);
      if (!res.ok) {
        throw new ApiError(502, "We couldn't activate that wallet right now. Please try again.");
      }
    }

    const enc = encryptSecret(keypair.secret());
    const account = await prisma.stellarAccount.create({
      data: {
        publicKey: keypair.publicKey(),
        encryptedSecret: enc.cipherText,
        encryptionIv: enc.iv,
        encryptionTag: enc.tag,
      },
    });

    await this.ensureUsdcReady(account.id, account.publicKey);
    return { id: account.id, publicKey: account.publicKey };
  }

  /** USDC trustline when the held asset is USDC. */
  async ensureUsdcReady(stellarAccountId: string, publicKey: string): Promise<void> {
    const cfg = await settingsService.asset();
    if (cfg.heldAsset !== "USDC") return;

    const svr = await server();
    const { networkPassphrase } = await settingsService.stellar();
    const asset = new Asset(cfg.usdcCode, cfg.usdcIssuer);
    const acct = await svr.loadAccount(publicKey);

    const hasTrustline = acct.balances.some(
      (b) =>
        b.asset_type !== "native" &&
        "asset_code" in b &&
        b.asset_code === cfg.usdcCode &&
        b.asset_issuer === cfg.usdcIssuer,
    );

    if (!hasTrustline) {
      const key = await this.loadKeypair(stellarAccountId);
      const tx = new TransactionBuilder(acct, { fee: BASE_FEE, networkPassphrase })
        .addOperation(
          Operation.changeTrust({
            asset,
            limit: "922337203685.4775807",
          }),
        )
        .setTimeout(60)
        .build();
      tx.sign(key);
      await this.submit(svr, tx);
    }
  }

  /** Initial USDC for new accounts (testnet treasury). */
  private async sendWelcomeFunds(publicKey: string): Promise<void> {
    const cfg = await settingsService.asset();
    if (cfg.heldAsset !== "USDC" || !cfg.treasuryAccountId) return;

    const treasury = await prisma.stellarAccount.findUnique({ where: { id: cfg.treasuryAccountId } });
    if (!treasury) return;

    try {
      await this.payFrom({
        fromAccountId: treasury.id,
        fromPublicKey: treasury.publicKey,
        toPublicKey: publicKey,
        amount: WELCOME_USDC,
      });
    } catch (err) {
      console.warn("Welcome USDC transfer skipped:", err);
    }
  }

  async pay(params: {
    fromAccountId: string;
    fromPublicKey: string;
    toPublicKey: string;
    amount: string;
  }): Promise<{ txHash: string }> {
    return this.payFrom(params);
  }

  private async payFrom(params: {
    fromAccountId: string;
    fromPublicKey: string;
    toPublicKey: string;
    amount: string;
  }): Promise<{ txHash: string }> {
    const svr = await server();
    const { networkPassphrase } = await settingsService.stellar();
    const asset = await this.heldAsset();
    const key = await this.loadKeypair(params.fromAccountId);
    const source = await svr.loadAccount(params.fromPublicKey);

    const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase })
      .addOperation(
        Operation.payment({
          destination: params.toPublicKey,
          asset,
          amount: params.amount,
        }),
      )
      .setTimeout(60)
      .build();
    tx.sign(key);
    const result = await this.submit(svr, tx);
    this.invalidateBalance(params.fromPublicKey);
    this.invalidateBalance(params.toPublicKey);
    return { txHash: result.hash };
  }

  async revealSecret(stellarAccountId: string): Promise<string> {
    const keypair = await this.loadKeypair(stellarAccountId);
    return keypair.secret();
  }

  async openSafetyNet(params: {
    ownerAccountId: string;
    ownerPublicKey: string;
    recipientPublicKey: string;
    amount: string;
    unlockAt: Date;
  }): Promise<{ balanceId: string; txHash: string }> {
    const svr = await server();
    const { networkPassphrase } = await settingsService.stellar();
    const asset = await this.heldAsset();
    const ownerKey = await this.loadKeypair(params.ownerAccountId);
    const source = await svr.loadAccount(params.ownerPublicKey);

    const unlockUnix = Math.floor(params.unlockAt.getTime() / 1000).toString();
    const claimants = [
      new Claimant(params.ownerPublicKey, Claimant.predicateUnconditional()),
      new Claimant(
        params.recipientPublicKey,
        Claimant.predicateNot(Claimant.predicateBeforeAbsoluteTime(unlockUnix)),
      ),
    ];

    const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase })
      .addOperation(
        Operation.createClaimableBalance({
          asset,
          amount: params.amount,
          claimants,
        }),
      )
      .setTimeout(60)
      .build();

    tx.sign(ownerKey);
    const result = await this.submit(svr, tx);
    this.invalidateBalance(params.ownerPublicKey);
    return { balanceId: tx.getClaimableBalanceId(0), txHash: result.hash };
  }

  /** One atomic tx: multiple claimable balances (split safety net). */
  async openSplitSafetyNets(params: {
    ownerAccountId: string;
    ownerPublicKey: string;
    splits: Array<{
      recipientPublicKey: string;
      amount: string;
      unlockAt: Date;
    }>;
  }): Promise<{ balanceIds: string[]; txHash: string }> {
    if (params.splits.length < 2) {
      throw new ApiError(400, "A split needs at least two recipients.");
    }

    const svr = await server();
    const { networkPassphrase } = await settingsService.stellar();
    const asset = await this.heldAsset();
    const ownerKey = await this.loadKeypair(params.ownerAccountId);
    const source = await svr.loadAccount(params.ownerPublicKey);

    let builder = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase });

    for (const split of params.splits) {
      const unlockUnix = Math.floor(split.unlockAt.getTime() / 1000).toString();
      const claimants = [
        new Claimant(params.ownerPublicKey, Claimant.predicateUnconditional()),
        new Claimant(
          split.recipientPublicKey,
          Claimant.predicateNot(Claimant.predicateBeforeAbsoluteTime(unlockUnix)),
        ),
      ];
      builder = builder.addOperation(
        Operation.createClaimableBalance({
          asset,
          amount: split.amount,
          claimants,
        }),
      );
    }

    const tx = builder.setTimeout(60).build();
    tx.sign(ownerKey);
    const result = await this.submit(svr, tx);
    this.invalidateBalance(params.ownerPublicKey);

    const balanceIds = params.splits.map((_, i) => tx.getClaimableBalanceId(i));
    return { balanceIds, txHash: result.hash };
  }

  async resetSafetyNet(params: {
    ownerAccountId: string;
    ownerPublicKey: string;
    recipientPublicKey: string;
    currentBalanceId: string;
    amount: string;
    newUnlockAt: Date;
  }): Promise<{ balanceId: string; txHash: string }> {
    const svr = await server();
    const { networkPassphrase } = await settingsService.stellar();
    const asset = await this.heldAsset();
    const ownerKey = await this.loadKeypair(params.ownerAccountId);
    const source = await svr.loadAccount(params.ownerPublicKey);

    const unlockUnix = Math.floor(params.newUnlockAt.getTime() / 1000).toString();
    const claimants = [
      new Claimant(params.ownerPublicKey, Claimant.predicateUnconditional()),
      new Claimant(
        params.recipientPublicKey,
        Claimant.predicateNot(Claimant.predicateBeforeAbsoluteTime(unlockUnix)),
      ),
    ];

    const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase })
      .addOperation(Operation.claimClaimableBalance({ balanceId: params.currentBalanceId }))
      .addOperation(
        Operation.createClaimableBalance({
          asset,
          amount: params.amount,
          claimants,
        }),
      )
      .setTimeout(60)
      .build();

    tx.sign(ownerKey);
    const result = await this.submit(svr, tx);
    this.invalidateBalance(params.ownerPublicKey);
    return { balanceId: tx.getClaimableBalanceId(1), txHash: result.hash };
  }

  async reclaimToOwner(params: {
    ownerAccountId: string;
    ownerPublicKey: string;
    balanceId: string;
  }): Promise<{ txHash: string }> {
    return this.claimBy({
      accountId: params.ownerAccountId,
      publicKey: params.ownerPublicKey,
      balanceId: params.balanceId,
    });
  }

  async claimToRecipient(params: {
    recipientAccountId: string;
    recipientPublicKey: string;
    balanceId: string;
  }): Promise<{ txHash: string }> {
    return this.claimBy({
      accountId: params.recipientAccountId,
      publicKey: params.recipientPublicKey,
      balanceId: params.balanceId,
    });
  }

  private async claimBy(params: {
    accountId: string;
    publicKey: string;
    balanceId: string;
  }): Promise<{ txHash: string }> {
    const svr = await server();
    const { networkPassphrase } = await settingsService.stellar();
    const key = await this.loadKeypair(params.accountId);
    const source = await svr.loadAccount(params.publicKey);

    const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase })
      .addOperation(Operation.claimClaimableBalance({ balanceId: params.balanceId }))
      .setTimeout(60)
      .build();

    tx.sign(key);
    const result = await this.submit(svr, tx);
    this.invalidateBalance(params.publicKey);
    return { txHash: result.hash };
  }

  async claimWithGuard(params: {
    recipientAccountId: string;
    recipientPublicKey: string;
    backupPublicKey: string;
    originalBalanceId: string;
    amount: string;
    guardUnlockAt: Date;
  }): Promise<{ guardBalanceId: string; txHash: string }> {
    const svr = await server();
    const { networkPassphrase } = await settingsService.stellar();
    const asset = await this.heldAsset();
    const key = await this.loadKeypair(params.recipientAccountId);
    const source = await svr.loadAccount(params.recipientPublicKey);

    const unlockUnix = Math.floor(params.guardUnlockAt.getTime() / 1000).toString();
    const claimants = [
      new Claimant(params.recipientPublicKey, Claimant.predicateUnconditional()),
      new Claimant(
        params.backupPublicKey,
        Claimant.predicateNot(Claimant.predicateBeforeAbsoluteTime(unlockUnix)),
      ),
    ];

    const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase })
      .addOperation(Operation.claimClaimableBalance({ balanceId: params.originalBalanceId }))
      .addOperation(
        Operation.createClaimableBalance({
          asset,
          amount: params.amount,
          claimants,
        }),
      )
      .setTimeout(60)
      .build();

    tx.sign(key);
    const result = await this.submit(svr, tx);
    this.invalidateBalance(params.recipientPublicKey);
    return { guardBalanceId: tx.getClaimableBalanceId(1), txHash: result.hash };
  }

  async resetGuard(params: {
    recipientAccountId: string;
    recipientPublicKey: string;
    backupPublicKey: string;
    currentBalanceId: string;
    amount: string;
    newUnlockAt: Date;
  }): Promise<{ guardBalanceId: string; txHash: string }> {
    const svr = await server();
    const { networkPassphrase } = await settingsService.stellar();
    const asset = await this.heldAsset();
    const key = await this.loadKeypair(params.recipientAccountId);
    const source = await svr.loadAccount(params.recipientPublicKey);

    const unlockUnix = Math.floor(params.newUnlockAt.getTime() / 1000).toString();
    const claimants = [
      new Claimant(params.recipientPublicKey, Claimant.predicateUnconditional()),
      new Claimant(
        params.backupPublicKey,
        Claimant.predicateNot(Claimant.predicateBeforeAbsoluteTime(unlockUnix)),
      ),
    ];

    const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase })
      .addOperation(Operation.claimClaimableBalance({ balanceId: params.currentBalanceId }))
      .addOperation(
        Operation.createClaimableBalance({
          asset,
          amount: params.amount,
          claimants,
        }),
      )
      .setTimeout(60)
      .build();

    tx.sign(key);
    const result = await this.submit(svr, tx);
    this.invalidateBalance(params.recipientPublicKey);
    return { guardBalanceId: tx.getClaimableBalanceId(1), txHash: result.hash };
  }

  async claimGuardAsBackup(params: {
    backupAccountId: string;
    backupPublicKey: string;
    guardBalanceId: string;
  }): Promise<{ txHash: string }> {
    const result = await this.claimBy({
      accountId: params.backupAccountId,
      publicKey: params.backupPublicKey,
      balanceId: params.guardBalanceId,
    });
    this.invalidateBalance(params.backupPublicKey);
    return result;
  }

  /** Spendable held-asset balance (USDC or XLM). Cached briefly. */
  async availableBalance(publicKey: string): Promise<string> {
    const hit = this.balanceCache.get(publicKey);
    if (hit && Date.now() - hit.at < BALANCE_CACHE_MS) {
      return hit.balance;
    }

    const cfg = await settingsService.asset();
    const svr = await server();
    const account = await svr.loadAccount(publicKey);

    let balance = "0";
    if (cfg.heldAsset === "USDC") {
      const usdc = account.balances.find(
        (b) =>
          b.asset_type !== "native" &&
          "asset_code" in b &&
          b.asset_code === cfg.usdcCode &&
          b.asset_issuer === cfg.usdcIssuer,
      );
      balance = usdc && "balance" in usdc ? usdc.balance : "0";
    } else {
      const native = account.balances.find((b) => b.asset_type === "native");
      balance = native ? native.balance : "0";
    }

    this.balanceCache.set(publicKey, { balance, at: Date.now() });
    return balance;
  }

  invalidateBalance(publicKey: string): void {
    this.balanceCache.delete(publicKey);
  }

  /** Testnet top-up in the held asset (USDC from treasury, or XLM via Friendbot relay). */
  async addTestFunds(destinationPublicKey: string, amount: string): Promise<{ txHash: string }> {
    const cfg = await settingsService.asset();

    if (cfg.heldAsset === "USDC" && cfg.treasuryAccountId) {
      const treasury = await prisma.stellarAccount.findUnique({ where: { id: cfg.treasuryAccountId } });
      if (treasury) {
        return this.payFrom({
          fromAccountId: treasury.id,
          fromPublicKey: treasury.publicKey,
          toPublicKey: destinationPublicKey,
          amount,
        });
      }
    }

    const svr = await server();
    const { friendbotUrl, networkPassphrase } = await settingsService.stellar();
    const source = Keypair.random();
    const funded = await fetch(`${friendbotUrl}?addr=${encodeURIComponent(source.publicKey())}`);
    if (!funded.ok) {
      throw new ApiError(502, "Couldn't add test funds right now. Please try again.");
    }

    const asset = await this.heldAsset();
    const sourceAccount = await svr.loadAccount(source.publicKey());
    const tx = new TransactionBuilder(sourceAccount, { fee: BASE_FEE, networkPassphrase })
      .addOperation(
        Operation.payment({
          destination: destinationPublicKey,
          asset,
          amount,
        }),
      )
      .setTimeout(60)
      .build();

    tx.sign(source);
    const result = await this.submit(svr, tx);
    this.invalidateBalance(destinationPublicKey);
    return { txHash: result.hash };
  }

  private async submit(svr: Horizon.Server, tx: Parameters<Horizon.Server["submitTransaction"]>[0]) {
    try {
      return await svr.submitTransaction(tx);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { extras?: { result_codes?: unknown } } } })?.response?.data
          ?.extras?.result_codes;
      console.error("Stellar submit failed:", JSON.stringify(detail ?? err));
      throw new ApiError(502, "The money couldn't be moved right now. Please try again.");
    }
  }
}

export const stellarService = new StellarService();
