/**
 * Application lifecycle on Stellar testnet.
 *
 * Unlike scripts/e2e-test.ts, which proves the claimable-balance design with
 * hand-built transactions, this suite drives Sagip's own service layer — the
 * exact code behind the API — against PostgreSQL and live testnet, then reads
 * the results back from Horizon. Every confirmed transaction is written to
 * artifacts/app-lifecycle-receipts.json.
 *
 * Requires DATABASE_URL, AUTH_TOKEN_SECRET, APP_ENCRYPTION_KEY and network
 * access to Horizon and Friendbot. Takes about two minutes because the
 * succession scenario waits for a one-minute guard window to pass.
 */
import assert from "node:assert/strict";
import { randomInt } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import { Horizon } from "@stellar/stellar-sdk";
import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { recipientService } from "@/server/services/recipient-service";
import { safetyNetService } from "@/server/services/safety-net-service";
import { settingsService } from "@/server/services/settings-service";
import { userService } from "@/server/services/user-service";
import { walletService } from "@/server/services/wallet-service";

const OUTPUT_PATH = resolve(
  process.env.APP_LIFECYCLE_RECEIPT_OUTPUT ?? "artifacts/app-lifecycle-receipts.json",
);

let horizon: Horizon.Server;
let explorerTxUrl = "";
let ownerId = "";
let ownerPhone = "";
let primaryPhone = "";
let primaryId = "";
let backupId = "";
let backupPublicKey = "";

function randomMobile(): string {
  return `0917${String(randomInt(0, 10_000_000)).padStart(7, "0")}`;
}

function sleep(ms: number) {
  return new Promise((done) => setTimeout(done, ms));
}

async function rejectsWith(promise: Promise<unknown>, status: number, message: RegExp) {
  await assert.rejects(promise, (err: unknown) => {
    assert.ok(err instanceof ApiError, `expected ApiError, got ${String(err)}`);
    assert.equal(err.status, status, err.message);
    assert.match(err.message, message);
    return true;
  });
}

/** Retries while the chain or the database still says "not yet". */
async function whenOpen<T>(action: () => Promise<T>, timeoutMs: number): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      return await action();
    } catch (err) {
      const notYet = err instanceof ApiError && err.status === 409 && /yet/.test(err.message);
      if (!notYet || Date.now() > deadline) throw err;
      await sleep(5_000);
    }
  }
}

async function claimableBalance(balanceId: string) {
  return horizon.claimableBalances().claimableBalance(balanceId).call();
}

async function nativeBalance(publicKey: string): Promise<number> {
  const account = await horizon.loadAccount(publicKey);
  return Number(account.balances.find((b) => b.asset_type === "native")?.balance ?? 0);
}

before(async () => {
  const [stellar, explorer, asset] = await Promise.all([
    settingsService.stellar(),
    settingsService.explorer(),
    settingsService.asset(),
  ]);
  assert.notEqual(explorer.network.toLowerCase(), "public", "lifecycle tests must never run on mainnet");
  assert.equal(asset.heldAsset, "XLM", "lifecycle tests expect the Friendbot-fundable XLM test setup");
  horizon = new Horizon.Server(stellar.horizonUrl);
  explorerTxUrl = explorer.explorerTxUrl;

  ownerPhone = randomMobile();
  primaryPhone = randomMobile();
  const signUp = await userService.signUp({
    name: "Lifecycle Sender",
    phone: ownerPhone,
    pin: "246810",
    device: "lifecycle-test",
  });
  ownerId = signUp.user.id;
  await walletService.create(ownerId, "Lifecycle wallet");

  const [primary, backup] = await Promise.all([
    recipientService.create(ownerId, { name: "Lifecycle Primary", relationship: "Daughter", phone: primaryPhone }),
    recipientService.create(ownerId, { name: "Lifecycle Backup", relationship: "Son" }),
  ]);
  primaryId = primary.id;
  backupId = backup.id;
  const backupRow = await recipientService.requireOwned(ownerId, backupId);
  backupPublicKey = backupRow.stellarAccount.publicKey;
});

after(async () => {
  if (ownerId) {
    const activity = await prisma.activity.findMany({
      where: { safetyNet: { ownerId }, txHash: { not: null } },
      include: { safetyNet: { select: { id: true, label: true } } },
      orderBy: { createdAt: "asc" },
    });
    const receipts = activity.map((a) => ({
      safetyNet: a.safetyNet.label,
      action: a.type,
      transactionHash: a.txHash,
      explorerUrl: `${explorerTxUrl}${a.txHash}`,
      recordedAt: a.createdAt.toISOString(),
    }));
    await mkdir(dirname(OUTPUT_PATH), { recursive: true });
    await writeFile(
      OUTPUT_PATH,
      `${JSON.stringify({ generatedAt: new Date().toISOString(), network: "testnet", receipts }, null, 2)}\n`,
    );
    console.log(`App lifecycle receipts (${receipts.length}): ${OUTPUT_PATH}`);
  }
  await prisma.$disconnect();
});

describe("sender check-in and take-back", () => {
  it("creates, checks in, and takes back through the service layer", async () => {
    const net = await safetyNetService.create(ownerId, {
      label: "Lifecycle check-in",
      amount: "25",
      recipientId: primaryId,
      checkInIntervalMinutes: 10080,
    });
    const created = await prisma.safetyNet.findUniqueOrThrow({ where: { id: net.id } });
    assert.equal(created.amount, "25.0000000");
    assert.equal(created.asset, "XLM");

    const onChain = await claimableBalance(created.balanceId!);
    assert.equal(onChain.asset, "native");
    assert.equal(onChain.amount, "25.0000000");
    assert.equal(onChain.claimants.length, 2);

    await rejectsWith(safetyNetService.claimByCode(created.claimCode), 409, /isn't open yet/);

    await safetyNetService.checkIn(ownerId, net.id);
    const renewed = await prisma.safetyNet.findUniqueOrThrow({ where: { id: net.id } });
    assert.notEqual(renewed.balanceId, created.balanceId);
    assert.ok(renewed.unlockAt > created.unlockAt);
    await assert.rejects(claimableBalance(created.balanceId!), "old balance must be gone");
    assert.equal((await claimableBalance(renewed.balanceId!)).asset, "native");

    const closed = await safetyNetService.close(ownerId, net.id);
    assert.equal(closed.status, "CLOSED");
    await assert.rejects(claimableBalance(renewed.balanceId!), "balance must be reclaimed");
    await rejectsWith(safetyNetService.close(ownerId, net.id), 409, /already finished/);
    await rejectsWith(safetyNetService.claimByCode(created.claimCode), 409, /no longer available/);
  });

  it("explains a real underfunded rejection instead of asking to retry", async () => {
    await rejectsWith(
      safetyNetService.create(ownerId, {
        label: "Too much",
        amount: "5000000",
        recipientId: primaryId,
        checkInIntervalMinutes: 10080,
      }),
      400,
      /isn't enough money/,
    );
  });
});

describe("primary receipt, receiver check-in, and backup receipt", () => {
  it("moves the money to the backup only after the primary stops checking in", async () => {
    const net = await safetyNetService.create(ownerId, {
      label: "Lifecycle succession",
      amount: "30",
      recipientId: primaryId,
      backupRecipientId: backupId,
      checkInIntervalMinutes: 10080,
      postReceiptCheckInIntervalMinutes: 1,
    });
    const row = await prisma.safetyNet.findUniqueOrThrow({ where: { id: net.id } });

    const links = await recipientService.findClaimLinks(primaryPhone, ownerPhone);
    assert.ok(links.some((link) => link.claimCode === row.claimCode));
    assert.deepEqual(await recipientService.findClaimLinks(primaryPhone, randomMobile()), []);

    await safetyNetService.requestEarly(row.claimCode);
    await safetyNetService.approveEarly(ownerId, net.id);

    const received = await whenOpen(() => safetyNetService.claimByCode(row.claimCode), 60_000);
    assert.equal(received.guarded, true);
    await rejectsWith(safetyNetService.claimByCode(row.claimCode), 409, /already been received/);
    await rejectsWith(safetyNetService.backupClaimByCode(row.claimCode), 409, /isn't open to the backup yet/);

    const guarded = await prisma.safetyNet.findUniqueOrThrow({ where: { id: net.id } });
    assert.equal(guarded.status, "GUARDED");
    const guard = await claimableBalance(guarded.postReceiptBalanceId!);
    assert.equal(guard.amount, "30.0000000");
    assert.ok(guard.claimants.some((c) => c.destination === backupPublicKey));

    await safetyNetService.receiverCheckInByCode(row.claimCode);
    const renewed = await prisma.safetyNet.findUniqueOrThrow({ where: { id: net.id } });
    assert.notEqual(renewed.postReceiptBalanceId, guarded.postReceiptBalanceId);

    const backupBefore = await nativeBalance(backupPublicKey);
    const backupResult = await whenOpen(() => safetyNetService.backupClaimByCode(row.claimCode), 150_000);
    assert.ok(backupResult.txHash);

    const finished = await prisma.safetyNet.findUniqueOrThrow({ where: { id: net.id } });
    assert.equal(finished.status, "BACKUP_RECEIVED");
    const backupAfter = await nativeBalance(backupPublicKey);
    assert.ok(backupAfter - backupBefore > 29.99, `backup gained ${backupAfter - backupBefore}`);
    await rejectsWith(safetyNetService.backupClaimByCode(row.claimCode), 409, /isn't available to the backup/);
  });
});
