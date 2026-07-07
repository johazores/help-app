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
 * The "safety net" is a claimable balance with two claimants:
 *   1. the owner  — unconditional  (they can always take the money back /
 *                                    reclaim-and-recreate to "check in")
 *   2. the family — not-before(unlockAt)  (opens only after the check-in lapses)
 *
 * "Checking in" reclaims the balance and recreates it with a later unlock date,
 * atomically, in a single transaction.
 */

async function server(): Promise<Horizon.Server> {
  const { horizonUrl } = await settingsService.stellar();
  return new Horizon.Server(horizonUrl);
}

export interface StoredAccount {
  id: string;
  publicKey: string;
}

class StellarService {
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
    return { id: account.id, publicKey: account.publicKey };
  }

  /**
   * Imports a user-provided secret key: validates it, funds the account via
   * Friendbot if it doesn't exist on the network yet, and stores it encrypted.
   */
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

    // If the account isn't on the network yet, activate it (testnet Friendbot).
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
    return { id: account.id, publicKey: account.publicKey };
  }

  /** Decrypts and returns a secret key (guarded upstream by PIN verification). */
  async revealSecret(stellarAccountId: string): Promise<string> {
    const keypair = await this.keypairFor(stellarAccountId);
    return keypair.secret();
  }

  private async keypairFor(stellarAccountId: string): Promise<Keypair> {
    const account = await prisma.stellarAccount.findUnique({ where: { id: stellarAccountId } });
    if (!account) throw new ApiError(404, "Account not found.");
    const secret = decryptSecret({
      cipherText: account.encryptedSecret,
      iv: account.encryptionIv,
      tag: account.encryptionTag,
    });
    return Keypair.fromSecret(secret);
  }

  /** Sets money aside: creates the claimable balance and returns its id + tx hash. */
  async openSafetyNet(params: {
    ownerAccountId: string;
    ownerPublicKey: string;
    recipientPublicKey: string;
    amount: string;
    unlockAt: Date;
  }): Promise<{ balanceId: string; txHash: string }> {
    const svr = await server();
    const { networkPassphrase } = await settingsService.stellar();
    const ownerKey = await this.keypairFor(params.ownerAccountId);
    const source = await svr.loadAccount(params.ownerPublicKey);

    const unlockUnix = Math.floor(params.unlockAt.getTime() / 1000).toString();
    const claimants = [
      // Owner can reclaim any time (check-in / cancel / take back).
      new Claimant(params.ownerPublicKey, Claimant.predicateUnconditional()),
      // Family can claim only once the unlock time has passed.
      new Claimant(
        params.recipientPublicKey,
        Claimant.predicateNot(Claimant.predicateBeforeAbsoluteTime(unlockUnix)),
      ),
    ];

    const tx = new TransactionBuilder(source, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        Operation.createClaimableBalance({
          asset: Asset.native(),
          amount: params.amount,
          claimants,
        }),
      )
      .setTimeout(60)
      .build();

    tx.sign(ownerKey);
    const result = await this.submit(svr, tx);
    return { balanceId: tx.getClaimableBalanceId(0), txHash: result.hash };
  }

  /** Check-in: reclaim the current balance and recreate it with a later unlock. */
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
    const ownerKey = await this.keypairFor(params.ownerAccountId);
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
          asset: Asset.native(),
          amount: params.amount,
          claimants,
        }),
      )
      .setTimeout(60)
      .build();

    tx.sign(ownerKey);
    const result = await this.submit(svr, tx);
    // The recreate is operation index 1.
    return { balanceId: tx.getClaimableBalanceId(1), txHash: result.hash };
  }

  /** Owner takes the money back (cancel). */
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

  /** Family receives the money after the net has opened. */
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
    const key = await this.keypairFor(params.accountId);
    const source = await svr.loadAccount(params.publicKey);

    const tx = new TransactionBuilder(source, { fee: BASE_FEE, networkPassphrase })
      .addOperation(Operation.claimClaimableBalance({ balanceId: params.balanceId }))
      .setTimeout(60)
      .build();

    tx.sign(key);
    const result = await this.submit(svr, tx);
    return { txHash: result.hash };
  }

  /** Spendable XLM balance for display. */
  async availableBalance(publicKey: string): Promise<string> {
    const svr = await server();
    const account = await svr.loadAccount(publicKey);
    const native = account.balances.find((b) => b.asset_type === "native");
    return native ? native.balance : "0";
  }

  /**
   * Testnet-only top-up. Creates a fresh Friendbot-funded account and forwards
   * `amount` XLM to the destination. This reliably works even when the
   * destination already exists (Friendbot can't re-fund existing accounts).
   * On mainnet this is replaced by a real on-ramp (see PRODUCTION.md).
   */
  async addTestFunds(destinationPublicKey: string, amount: string): Promise<{ txHash: string }> {
    const svr = await server();
    const { friendbotUrl, networkPassphrase } = await settingsService.stellar();

    const source = Keypair.random();
    const funded = await fetch(`${friendbotUrl}?addr=${encodeURIComponent(source.publicKey())}`);
    if (!funded.ok) {
      throw new ApiError(502, "Couldn't add test funds right now. Please try again.");
    }

    const sourceAccount = await svr.loadAccount(source.publicKey());
    const tx = new TransactionBuilder(sourceAccount, { fee: BASE_FEE, networkPassphrase })
      .addOperation(
        Operation.payment({
          destination: destinationPublicKey,
          asset: Asset.native(),
          amount,
        }),
      )
      .setTimeout(60)
      .build();

    tx.sign(source);
    const result = await this.submit(svr, tx);
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
