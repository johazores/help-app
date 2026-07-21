import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  Asset,
  BASE_FEE,
  Claimant,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  type Transaction,
} from "@stellar/stellar-sdk";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const FRIENDBOT_URL = "https://friendbot.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const EXPLORER_TX_URL = "https://stellar.expert/explorer/testnet/tx/";
const AMOUNT = "25.0000000";
const UNLOCK_DELAY_MS = 4_000;
const OUTPUT_PATH = resolve(
  process.env.INSTAWARDS_RECEIPT_OUTPUT ?? "artifacts/instawards-receipts.json",
);

const server = new Horizon.Server(HORIZON_URL);

type Receipt = {
  scenario: string;
  action: string;
  transactionHash: string;
  explorerUrl: string;
  sourceAccount: string;
  balanceId: string | null;
  confirmedAt: string;
};

const receipts: Receipt[] = [];

function unix(date: Date): string {
  return Math.floor(date.getTime() / 1000).toString();
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function fund(account: Keypair, label: string): Promise<void> {
  const response = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(account.publicKey())}`);
  if (!response.ok) {
    throw new Error(`Friendbot failed for ${label}: HTTP ${response.status}`);
  }
  console.log(`[fund] ${label}: ${account.publicKey()}`);
}

async function nativeBalance(publicKey: string): Promise<number> {
  const account = await server.loadAccount(publicKey);
  const native = account.balances.find((balance) => balance.asset_type === "native");
  return native ? Number(native.balance) : 0;
}

async function submit(params: {
  scenario: string;
  action: string;
  signer: Keypair;
  transaction: Transaction;
  balanceId?: string;
}): Promise<string> {
  params.transaction.sign(params.signer);
  const result = await server.submitTransaction(params.transaction);
  const explorerUrl = `${EXPLORER_TX_URL}${result.hash}`;

  receipts.push({
    scenario: params.scenario,
    action: params.action,
    transactionHash: result.hash,
    explorerUrl,
    sourceAccount: params.signer.publicKey(),
    balanceId: params.balanceId ?? null,
    confirmedAt: new Date().toISOString(),
  });

  console.log(`[${params.scenario}] ${params.action}: ${result.hash}`);
  console.log(`[${params.scenario}] ${explorerUrl}`);
  return result.hash;
}

async function ownerLifecycle(): Promise<void> {
  const scenario = "owner-check-in-and-take-back";
  const owner = Keypair.random();
  const recipient = Keypair.random();

  await Promise.all([fund(owner, `${scenario} owner`), fund(recipient, `${scenario} recipient`)]);

  const ownerBefore = await nativeBalance(owner.publicKey());
  const recipientBefore = await nativeBalance(recipient.publicKey());
  const firstUnlock = new Date(Date.now() + 10 * 60_000);

  const createSource = await server.loadAccount(owner.publicKey());
  const createTransaction = new TransactionBuilder(createSource, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.createClaimableBalance({
        asset: Asset.native(),
        amount: AMOUNT,
        claimants: [
          new Claimant(owner.publicKey(), Claimant.predicateUnconditional()),
          new Claimant(
            recipient.publicKey(),
            Claimant.predicateNot(Claimant.predicateBeforeAbsoluteTime(unix(firstUnlock))),
          ),
        ],
      }),
    )
    .setTimeout(60)
    .build();

  const firstBalanceId = createTransaction.getClaimableBalanceId(0);
  await submit({
    scenario,
    action: "create",
    signer: owner,
    transaction: createTransaction,
    balanceId: firstBalanceId,
  });

  const renewedUnlock = new Date(Date.now() + 20 * 60_000);
  const checkInSource = await server.loadAccount(owner.publicKey());
  const checkInTransaction = new TransactionBuilder(checkInSource, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.claimClaimableBalance({ balanceId: firstBalanceId }))
    .addOperation(
      Operation.createClaimableBalance({
        asset: Asset.native(),
        amount: AMOUNT,
        claimants: [
          new Claimant(owner.publicKey(), Claimant.predicateUnconditional()),
          new Claimant(
            recipient.publicKey(),
            Claimant.predicateNot(Claimant.predicateBeforeAbsoluteTime(unix(renewedUnlock))),
          ),
        ],
      }),
    )
    .setTimeout(60)
    .build();

  const renewedBalanceId = checkInTransaction.getClaimableBalanceId(1);
  await submit({
    scenario,
    action: "check-in",
    signer: owner,
    transaction: checkInTransaction,
    balanceId: renewedBalanceId,
  });

  const takeBackSource = await server.loadAccount(owner.publicKey());
  const takeBackTransaction = new TransactionBuilder(takeBackSource, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.claimClaimableBalance({ balanceId: renewedBalanceId }))
    .setTimeout(60)
    .build();

  await submit({
    scenario,
    action: "take-back",
    signer: owner,
    transaction: takeBackTransaction,
    balanceId: renewedBalanceId,
  });

  const ownerAfter = await nativeBalance(owner.publicKey());
  const recipientAfter = await nativeBalance(recipient.publicKey());
  const ownerLoss = ownerBefore - ownerAfter;
  const recipientDelta = recipientAfter - recipientBefore;

  if (ownerLoss >= 0.01) {
    throw new Error(`Owner principal was not recovered. Balance loss: ${ownerLoss}`);
  }
  if (Math.abs(recipientDelta) >= 0.0001) {
    throw new Error(`Recipient balance changed before eligibility: ${recipientDelta}`);
  }
}

async function successionLifecycle(): Promise<void> {
  const scenario = "primary-and-backup-succession";
  const owner = Keypair.random();
  const primary = Keypair.random();
  const backup = Keypair.random();

  await Promise.all([
    fund(owner, `${scenario} owner`),
    fund(primary, `${scenario} primary`),
    fund(backup, `${scenario} backup`),
  ]);

  const backupBefore = await nativeBalance(backup.publicKey());
  const primaryUnlock = new Date(Date.now() + UNLOCK_DELAY_MS);

  const createSource = await server.loadAccount(owner.publicKey());
  const createTransaction = new TransactionBuilder(createSource, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.createClaimableBalance({
        asset: Asset.native(),
        amount: AMOUNT,
        claimants: [
          new Claimant(owner.publicKey(), Claimant.predicateUnconditional()),
          new Claimant(
            primary.publicKey(),
            Claimant.predicateNot(Claimant.predicateBeforeAbsoluteTime(unix(primaryUnlock))),
          ),
        ],
      }),
    )
    .setTimeout(60)
    .build();

  const originalBalanceId = createTransaction.getClaimableBalanceId(0);
  await submit({
    scenario,
    action: "create",
    signer: owner,
    transaction: createTransaction,
    balanceId: originalBalanceId,
  });

  await sleep(UNLOCK_DELAY_MS + 2_000);

  const firstGuardUnlock = new Date(Date.now() + UNLOCK_DELAY_MS);
  const primarySource = await server.loadAccount(primary.publicKey());
  const primaryClaimTransaction = new TransactionBuilder(primarySource, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.claimClaimableBalance({ balanceId: originalBalanceId }))
    .addOperation(
      Operation.createClaimableBalance({
        asset: Asset.native(),
        amount: AMOUNT,
        claimants: [
          new Claimant(primary.publicKey(), Claimant.predicateUnconditional()),
          new Claimant(
            backup.publicKey(),
            Claimant.predicateNot(Claimant.predicateBeforeAbsoluteTime(unix(firstGuardUnlock))),
          ),
        ],
      }),
    )
    .setTimeout(60)
    .build();

  const firstGuardBalanceId = primaryClaimTransaction.getClaimableBalanceId(1);
  await submit({
    scenario,
    action: "primary-receive-and-guard",
    signer: primary,
    transaction: primaryClaimTransaction,
    balanceId: firstGuardBalanceId,
  });

  const renewedGuardUnlock = new Date(Date.now() + UNLOCK_DELAY_MS);
  const checkInSource = await server.loadAccount(primary.publicKey());
  const receiverCheckInTransaction = new TransactionBuilder(checkInSource, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.claimClaimableBalance({ balanceId: firstGuardBalanceId }))
    .addOperation(
      Operation.createClaimableBalance({
        asset: Asset.native(),
        amount: AMOUNT,
        claimants: [
          new Claimant(primary.publicKey(), Claimant.predicateUnconditional()),
          new Claimant(
            backup.publicKey(),
            Claimant.predicateNot(Claimant.predicateBeforeAbsoluteTime(unix(renewedGuardUnlock))),
          ),
        ],
      }),
    )
    .setTimeout(60)
    .build();

  const renewedGuardBalanceId = receiverCheckInTransaction.getClaimableBalanceId(1);
  await submit({
    scenario,
    action: "receiver-check-in",
    signer: primary,
    transaction: receiverCheckInTransaction,
    balanceId: renewedGuardBalanceId,
  });

  await sleep(UNLOCK_DELAY_MS + 2_000);

  const backupSource = await server.loadAccount(backup.publicKey());
  const backupClaimTransaction = new TransactionBuilder(backupSource, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.claimClaimableBalance({ balanceId: renewedGuardBalanceId }))
    .setTimeout(60)
    .build();

  await submit({
    scenario,
    action: "backup-receive",
    signer: backup,
    transaction: backupClaimTransaction,
    balanceId: renewedGuardBalanceId,
  });

  const backupAfter = await nativeBalance(backup.publicKey());
  const backupDelta = backupAfter - backupBefore;
  if (backupDelta < Number(AMOUNT) - 0.01) {
    throw new Error(`Backup beneficiary did not receive the expected amount: ${backupDelta}`);
  }
}

async function writeManifest(): Promise<void> {
  const manifest = {
    project: "Sagip",
    network: "Stellar testnet",
    generatedAt: new Date().toISOString(),
    receiptCount: receipts.length,
    receipts,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Receipt manifest: ${OUTPUT_PATH}`);
}

async function main(): Promise<void> {
  console.log("=== Sagip full lifecycle E2E - Stellar testnet ===");
  await ownerLifecycle();
  await successionLifecycle();
  await writeManifest();

  if (receipts.length !== 7) {
    throw new Error(`Expected 7 confirmed transactions, received ${receipts.length}.`);
  }

  console.log("=== RESULT: PASS ===");
  console.log("Create, check-in, take-back, primary receive, receiver check-in, and backup receive were verified on-chain.");
}

main().catch((error) => {
  console.error("=== RESULT: FAIL ===");
  console.error((error as { response?: { data?: unknown } })?.response?.data ?? error);
  process.exit(1);
});
