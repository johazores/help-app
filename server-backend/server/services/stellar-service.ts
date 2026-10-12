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
import { log } from "@/lib/log";
import { resultCodesOf, submitFailureToApiError } from "@/lib/stellar-errors";
import { settingsService } from "@/server/services/settings-service";

/**
 * The only place that talks to Stellar. Everything is classic-layer:
 * claimable balances + native time predicates. No smart contracts.
 *
 * Held asset defaults to USDC on testnet (stable savings); XLM is kept only
 * for network fees. Configure via Setting table (see prisma/seed.ts).
 * Operations on an existing safety net always use the asset that net was
 * created with, so a later configuration change can never re-create a
 * balance in a different asset.
 */

const WELCOME_USDC = "10000.0000000";
const BALANCE_CACHE_MS = 20_000;
const FRIENDBOT_TIMEOUT_MS = 30_000;
const TX_TIMEOUT_SECONDS = 60;
const MAX_TRUST_LIMIT = "922337203685.4775807";

const servers = new Map<string, Horizon.Server>();

async function server(): Promise<Horizon.Server> {
  const { horizonUrl } = await settingsService.stellar();
  let svr = servers.get(horizonUrl);
  if (!svr) {
    svr = new Horizon.Server(horizonUrl);
    servers.set(horizonUrl, svr);
  }
  return svr;
}

function unixSeconds(date: Date): string {
  return Math.floor(date.getTime() / 1000).toString();
}

/**
 * The two-claimant shape every Sagip balance uses: one party may claim at any
 * time, the other only once `unlockAt` has passed.
 */
function timeLockedClaimants(
  unconditionalPublicKey: string,
  timeLockedPublicKey: string,
  unlockAt: Date,
): Claimant[] {
  return [
    new Claimant(unconditionalPublicKey, Claimant.predicateUnconditional()),
    new Claimant(
      timeLockedPublicKey,
      Claimant.predicateNot(Claimant.predicateBeforeAbsoluteTime(unixSeconds(unlockAt))),
    ),
  ];
}

function isNotFound(err: unknown): boolean {
  return (err as { response?: { status?: number } })?.response?.status === 404;
}

export interface StoredAccount {
  id: string;
  publicKey: string;
}

class StellarService {
  private balanceCache = new Map<string, { balance: string; at: number }>();

  /** The asset code new safety nets and balances use (from settings). */
  async heldAssetCode(): Promise<"XLM" | "USDC"> {
    return (await settingsService.asset()).heldAsset;
  }

  /** Resolves a stored asset code ("XLM" or "USDC") to a Stellar asset. */
  async assetFor(code: string): Promise<Asset> {
    if (code === "USDC") {
      const cfg = await settingsService.asset();
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

  private async fundWithFriendbot(publicKey: string, failureMessage: string): Promise<void> {
    const { friendbotUrl } = await settingsService.stellar();
    try {
      const res = await fetch(`${friendbotUrl}?addr=${encodeURIComponent(publicKey)}`, {
        signal: AbortSignal.timeout(FRIENDBOT_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`Friendbot returned ${res.status}`);
    } catch (error) {
      log("warn", "stellar.friendbot_failed", { publicKey, error });
      throw new ApiError(502, failureMessage);
    }
  }

  private async storeAccount(keypair: Keypair): Promise<StoredAccount> {
    const enc = encryptSecret(keypair.secret());
    const account = await prisma.stellarAccount.create({
      data: {
        publicKey: keypair.publicKey(),
        encryptedSecret: enc.cipherText,
        encryptionIv: enc.iv,
        encryptionTag: enc.tag,
      },
    });
    return { id: account.id, publicKey: account.publicKey };
  }

  /** Creates a keypair, funds it via Friendbot (testnet), and stores it encrypted. */
  async createFundedAccount(): Promise<StoredAccount> {
    const keypair = Keypair.random();
    await this.fundWithFriendbot(
      keypair.publicKey(),
      "We couldn't set up the account right now. Please try again.",
    );
    const account = await this.storeAccount(keypair);
    await this.ensureUsdcReady(account.id, account.publicKey);
    await this.sendWelcomeFunds(account.publicKey);
    return account;
  }

  async importAccount(secretKey: string): Promise<StoredAccount> {
    let keypair: Keypair;
    try {
      // Keys copied by hand are often written in groups; spaces are not part of the key.
      keypair = Keypair.fromSecret(secretKey.replace(/\s+/g, "").toUpperCase());
    } catch {
      throw new ApiError(400, "That doesn't look like a valid recovery key. Please check it and try again.");
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
    } catch (err) {
      if (!isNotFound(err)) {
        throw new ApiError(502, "We couldn't check that wallet right now. Please try again.");
      }
      await this.fundWithFriendbot(
        keypair.publicKey(),
        "We couldn't activate that wallet right now. Please try again.",
      );
    }

    const account = await this.storeAccount(keypair);
    await this.ensureUsdcReady(account.id, account.publicKey);
    return account;
  }

  /**
   * Adds the USDC trustline an account needs before it can hold USDC.
   * `assetCode` defaults to the configured held asset; pass a safety net's
   * stored asset when acting on an existing net.
   */
  async ensureUsdcReady(stellarAccountId: string, publicKey: string, assetCode?: string): Promise<void> {
    const cfg = await settingsService.asset();
    if ((assetCode ?? cfg.heldAsset) !== "USDC") return;

    const svr = await server();
    const { networkPassphrase } = await settingsService.stellar();
    const acct = await svr.loadAccount(publicKey);

    const hasTrustline = acct.balances.some(
      (b) =>
        b.asset_type !== "native" &&
        "asset_code" in b &&
        b.asset_code === cfg.usdcCode &&
        b.asset_issuer === cfg.usdcIssuer,
    );
    if (hasTrustline) return;

    const key = await this.loadKeypair(stellarAccountId);
    const tx = new TransactionBuilder(acct, { fee: BASE_FEE, networkPassphrase })
      .addOperation(
        Operation.changeTrust({
          asset: new Asset(cfg.usdcCode, cfg.usdcIssuer),
          limit: MAX_TRUST_LIMIT,
        }),
      )
      .setTimeout(TX_TIMEOUT_SECONDS)
      .build();
    tx.sign(key);
    await this.submit(svr, tx, "trustline");
  }

  /** Initial USDC for new accounts (testnet treasury). */
  private async sendWelcomeFunds(publicKey: string): Promise<void> {
    const cfg = await settingsService.asset();
    if (cfg.heldAsset !== "USDC" || !cfg.treasuryAccountId) return;

    const treasury = await prisma.stellarAccount.findUnique({ where: { id: cfg.treasuryAccountId } });
    if (!treasury) return;

    try {
      await this.pay({
        fromAccountId: treasury.id,
        fromPublicKey: treasury.publicKey,
        toPublicKey: publicKey,
        amount: WELCOME_USDC,
      });
    } catch (error) {
      log("warn", "stellar.welcome_funds_skipped", { publicKey, error });
    }
  }

  /**
   * Direct payment in the held asset (or `assetCode` when given). `onSigned`
   * receives the transaction hash before submission, so a caller can record
   * it and later ask the network whether an interrupted payment confirmed.
   */
  async pay(params: {
    fromAccountId: string;
    fromPublicKey: string;
    toPublicKey: string;
    amount: string;
    assetCode?: string;
    onSigned?: (txHash: string) => Promise<void>;
  }): Promise<{ txHash: string }> {
    const svr = await server();
    const { networkPassphrase } = await settingsService.stellar();
    const asset = await this.assetFor(params.assetCode ?? (await this.heldAssetCode()));
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
      .setTimeout(TX_TIMEOUT_SECONDS)
      .build();
    tx.sign(key);
    await params.onSigned?.(tx.hash().toString("hex"));
    const result = await this.submit(svr, tx, "payment");
    this.invalidateBalance(params.fromPublicKey);
    this.invalidateBalance(params.toPublicKey);
    return { txHash: result.hash };
  }

  /**
   * What the network knows about a transaction: "success", "failed", or
   * "missing" (never applied). Every Sagip transaction expires after
   * TX_TIMEOUT_SECONDS, so "missing" after that window is final.
   */
  async transactionOutcome(txHash: string): Promise<"success" | "failed" | "missing"> {
    const svr = await server();
    try {
      const record = await svr.transactions().transaction(txHash).call();
      return record.successful ? "success" : "failed";
    } catch (err) {
      if (isNotFound(err)) return "missing";
      throw new ApiError(502, "We couldn't check the payment status right now. Please try again.");
    }
  }

  /** Seconds after which an unconfirmed Sagip transaction can no longer apply. */
  get transactionTimeoutSeconds(): number {
    return TX_TIMEOUT_SECONDS;
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
    assetCode: string;
    unlockAt: Date;
  }): Promise<{ balanceId: string; txHash: string }> {
    const svr = await server();
    const { networkPassphrase } = await settingsService.stellar();
    const asset = await this.assetFor(params.assetCode);
    const ownerKey = await this.loadKeypair(params.ownerAccountId);
    const source = await svr.loadAccount(params.ownerPublicKey);

    const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase })
      .addOperation(
        Operation.createClaimableBalance({
          asset,
          amount: params.amount,
          claimants: timeLockedClaimants(params.ownerPublicKey, params.recipientPublicKey, params.unlockAt),
        }),
      )
      .setTimeout(TX_TIMEOUT_SECONDS)
      .build();

    tx.sign(ownerKey);
    const result = await this.submit(svr, tx, "create");
    this.invalidateBalance(params.ownerPublicKey);
    return { balanceId: tx.getClaimableBalanceId(0), txHash: result.hash };
  }

  /** One atomic tx: multiple claimable balances (split safety net). */
  async openSplitSafetyNets(params: {
    ownerAccountId: string;
    ownerPublicKey: string;
    assetCode: string;
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
    const asset = await this.assetFor(params.assetCode);
    const ownerKey = await this.loadKeypair(params.ownerAccountId);
    const source = await svr.loadAccount(params.ownerPublicKey);

    const builder = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase });
    for (const split of params.splits) {
      builder.addOperation(
        Operation.createClaimableBalance({
          asset,
          amount: split.amount,
          claimants: timeLockedClaimants(params.ownerPublicKey, split.recipientPublicKey, split.unlockAt),
        }),
      );
    }

    const tx = builder.setTimeout(TX_TIMEOUT_SECONDS).build();
    tx.sign(ownerKey);
    const result = await this.submit(svr, tx, "create-split");
    this.invalidateBalance(params.ownerPublicKey);

    const balanceIds = params.splits.map((_, i) => tx.getClaimableBalanceId(i));
    return { balanceIds, txHash: result.hash };
  }

  /**
   * One atomic transaction that claims `currentBalanceId` and immediately
   * re-locks the same amount: the signer stays the unconditional claimant and
   * `timeLockedPublicKey` may claim only after `unlockAt`. Used for sender
   * check-ins, early opening, primary receipt into a guard, and receiver
   * check-ins. If any part fails, nothing moves.
   */
  private async claimAndRelock(params: {
    signerAccountId: string;
    signerPublicKey: string;
    timeLockedPublicKey: string;
    currentBalanceId: string;
    amount: string;
    assetCode: string;
    unlockAt: Date;
    action: string;
  }): Promise<{ balanceId: string; txHash: string }> {
    const svr = await server();
    const { networkPassphrase } = await settingsService.stellar();
    const asset = await this.assetFor(params.assetCode);
    const key = await this.loadKeypair(params.signerAccountId);
    const source = await svr.loadAccount(params.signerPublicKey);

    const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase })
      .addOperation(Operation.claimClaimableBalance({ balanceId: params.currentBalanceId }))
      .addOperation(
        Operation.createClaimableBalance({
          asset,
          amount: params.amount,
          claimants: timeLockedClaimants(params.signerPublicKey, params.timeLockedPublicKey, params.unlockAt),
        }),
      )
      .setTimeout(TX_TIMEOUT_SECONDS)
      .build();

    tx.sign(key);
    const result = await this.submit(svr, tx, params.action);
    this.invalidateBalance(params.signerPublicKey);
    return { balanceId: tx.getClaimableBalanceId(1), txHash: result.hash };
  }

  /** Sender check-in (or early opening when `newUnlockAt` is now). */
  async resetSafetyNet(params: {
    ownerAccountId: string;
    ownerPublicKey: string;
    recipientPublicKey: string;
    currentBalanceId: string;
    amount: string;
    assetCode: string;
    newUnlockAt: Date;
  }): Promise<{ balanceId: string; txHash: string }> {
    return this.claimAndRelock({
      signerAccountId: params.ownerAccountId,
      signerPublicKey: params.ownerPublicKey,
      timeLockedPublicKey: params.recipientPublicKey,
      currentBalanceId: params.currentBalanceId,
      amount: params.amount,
      assetCode: params.assetCode,
      unlockAt: params.newUnlockAt,
      action: "check-in",
    });
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
      action: "take-back",
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
      action: "receive",
    });
  }

  private async claimBy(params: {
    accountId: string;
    publicKey: string;
    balanceId: string;
    action: string;
  }): Promise<{ txHash: string }> {
    const svr = await server();
    const { networkPassphrase } = await settingsService.stellar();
    const key = await this.loadKeypair(params.accountId);
    const source = await svr.loadAccount(params.publicKey);

    const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase })
      .addOperation(Operation.claimClaimableBalance({ balanceId: params.balanceId }))
      .setTimeout(TX_TIMEOUT_SECONDS)
      .build();

    tx.sign(key);
    const result = await this.submit(svr, tx, params.action);
    this.invalidateBalance(params.publicKey);
    return { txHash: result.hash };
  }

  /** Primary receiver claims, and the funds stay guarded for the backup. */
  async claimWithGuard(params: {
    recipientAccountId: string;
    recipientPublicKey: string;
    backupPublicKey: string;
    originalBalanceId: string;
    amount: string;
    assetCode: string;
    guardUnlockAt: Date;
  }): Promise<{ guardBalanceId: string; txHash: string }> {
    const { balanceId, txHash } = await this.claimAndRelock({
      signerAccountId: params.recipientAccountId,
      signerPublicKey: params.recipientPublicKey,
      timeLockedPublicKey: params.backupPublicKey,
      currentBalanceId: params.originalBalanceId,
      amount: params.amount,
      assetCode: params.assetCode,
      unlockAt: params.guardUnlockAt,
      action: "receive-guarded",
    });
    return { guardBalanceId: balanceId, txHash };
  }

  /** Primary receiver check-in: pushes the backup's unlock date forward. */
  async resetGuard(params: {
    recipientAccountId: string;
    recipientPublicKey: string;
    backupPublicKey: string;
    currentBalanceId: string;
    amount: string;
    assetCode: string;
    newUnlockAt: Date;
  }): Promise<{ guardBalanceId: string; txHash: string }> {
    const { balanceId, txHash } = await this.claimAndRelock({
      signerAccountId: params.recipientAccountId,
      signerPublicKey: params.recipientPublicKey,
      timeLockedPublicKey: params.backupPublicKey,
      currentBalanceId: params.currentBalanceId,
      amount: params.amount,
      assetCode: params.assetCode,
      unlockAt: params.newUnlockAt,
      action: "receiver-check-in",
    });
    return { guardBalanceId: balanceId, txHash };
  }

  async claimGuardAsBackup(params: {
    backupAccountId: string;
    backupPublicKey: string;
    guardBalanceId: string;
  }): Promise<{ txHash: string }> {
    return this.claimBy({
      accountId: params.backupAccountId,
      publicKey: params.backupPublicKey,
      balanceId: params.guardBalanceId,
      action: "backup-receive",
    });
  }

  /** Spendable held-asset balance (USDC or XLM). Cached briefly. */
  async availableBalance(publicKey: string): Promise<string> {
    const hit = this.balanceCache.get(publicKey);
    if (hit && Date.now() - hit.at < BALANCE_CACHE_MS) {
      return hit.balance;
    }

    const cfg = await settingsService.asset();
    const svr = await server();
    let account: Horizon.AccountResponse;
    try {
      account = await svr.loadAccount(publicKey);
    } catch (err) {
      if (isNotFound(err)) return "0";
      throw new ApiError(502, "We couldn't check your balance right now. Please try again.");
    }

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
        return this.pay({
          fromAccountId: treasury.id,
          fromPublicKey: treasury.publicKey,
          toPublicKey: destinationPublicKey,
          amount,
        });
      }
    }

    const svr = await server();
    const { networkPassphrase } = await settingsService.stellar();
    const source = Keypair.random();
    await this.fundWithFriendbot(source.publicKey(), "Couldn't add test funds right now. Please try again.");

    const asset = await this.assetFor(cfg.heldAsset);
    const sourceAccount = await svr.loadAccount(source.publicKey());
    const tx = new TransactionBuilder(sourceAccount, { fee: BASE_FEE, networkPassphrase })
      .addOperation(
        Operation.payment({
          destination: destinationPublicKey,
          asset,
          amount,
        }),
      )
      .setTimeout(TX_TIMEOUT_SECONDS)
      .build();

    tx.sign(source);
    const result = await this.submit(svr, tx, "test-funds");
    this.invalidateBalance(destinationPublicKey);
    return { txHash: result.hash };
  }

  private async submit(
    svr: Horizon.Server,
    tx: Parameters<Horizon.Server["submitTransaction"]>[0],
    action: string,
  ) {
    const txHash = tx.hash().toString("hex");
    try {
      return await svr.submitTransaction(tx);
    } catch (err: unknown) {
      log("error", "stellar.submit_failed", {
        action,
        txHash,
        resultCodes: resultCodesOf(err),
        error: resultCodesOf(err) ? undefined : err,
      });
      throw submitFailureToApiError(err);
    }
  }
}

export const stellarService = new StellarService();
