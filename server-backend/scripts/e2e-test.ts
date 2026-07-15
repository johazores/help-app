/**
 * Sagip — end-to-end test on Stellar testnet.
 *
 * Runs the exact operations the app uses (claimable balances + time predicates)
 * and proves the full send/receive flow with real testnet assets:
 *   1. Fund a sender account (Friendbot)
 *   2. Fund a recipient account (Friendbot)
 *   3. Sender sets money aside  -> createClaimableBalance
 *   4. Recipient receives it     -> claimClaimableBalance
 *   5. Validate balances, fees, and print explorer links + tx hashes
 *
 * Run:  npx tsx scripts/e2e-test.ts
 * (Requires outbound network access to Stellar testnet.)
 */
import {
  Asset,
  BASE_FEE,
  Claimant,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

const HORIZON = "https://horizon-testnet.stellar.org";
const FRIENDBOT = "https://friendbot.stellar.org";
const PASSPHRASE = Networks.TESTNET;
const EXPLORER_TX = "https://stellar.expert/explorer/testnet/tx/";
const AMOUNT = "100.0000000";

const server = new Horizon.Server(HORIZON);
const feeXlm = (ops: number) => (Number(BASE_FEE) * ops) / 1e7;

function log(step: string, msg: string) {
  console.log(`\n[${step}] ${msg}`);
}

async function fund(kp: Keypair, label: string) {
  const res = await fetch(`${FRIENDBOT}?addr=${kp.publicKey()}`);
  if (!res.ok) throw new Error(`Friendbot failed for ${label}: ${res.status}`);
  log("FUND", `${label} funded: ${kp.publicKey()}`);
}

async function nativeBalance(pk: string): Promise<number> {
  const acct = await server.loadAccount(pk);
  const native = acct.balances.find((b) => b.asset_type === "native");
  return native ? Number(native.balance) : 0;
}

async function main() {
  console.log("=== Sagip E2E test — Stellar testnet ===");

  const sender = Keypair.random();
  const recipient = Keypair.random();

  await fund(sender, "Sender");
  await fund(recipient, "Recipient");

  const senderBefore = await nativeBalance(sender.publicKey());
  const recipientBefore = await nativeBalance(recipient.publicKey());
  log("BALANCE", `Sender before:    ${senderBefore} XLM`);
  log("BALANCE", `Recipient before: ${recipientBefore} XLM`);

  // 3) Sender sets money aside (createClaimableBalance) — same predicates as the app.
  const unlockAt = Math.floor(Date.now() / 1000) + 3; // claimable in ~3s
  const claimants = [
    new Claimant(sender.publicKey(), Claimant.predicateUnconditional()),
    new Claimant(
      recipient.publicKey(),
      Claimant.predicateNot(Claimant.predicateBeforeAbsoluteTime(String(unlockAt))),
    ),
  ];

  const senderAcct = await server.loadAccount(sender.publicKey());
  const createTx = new TransactionBuilder(senderAcct, { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
    .addOperation(Operation.createClaimableBalance({ asset: Asset.native(), amount: AMOUNT, claimants }))
    .setTimeout(60)
    .build();
  createTx.sign(sender);
  const createRes = await server.submitTransaction(createTx);
  const balanceId = createTx.getClaimableBalanceId(0);
  log("SEND", `Set aside ${AMOUNT} XLM. tx: ${createRes.hash}`);
  log("SEND", `Explorer: ${EXPLORER_TX}${createRes.hash}`);
  log("SEND", `Claimable balance id: ${balanceId}`);

  // 5) Wait for the predicate to unlock, then recipient claims.
  await new Promise((r) => setTimeout(r, 5000));

  const recipientAcct = await server.loadAccount(recipient.publicKey());
  const claimTx = new TransactionBuilder(recipientAcct, { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
    .addOperation(Operation.claimClaimableBalance({ balanceId }))
    .setTimeout(60)
    .build();
  claimTx.sign(recipient);
  const claimRes = await server.submitTransaction(claimTx);
  log("RECEIVE", `Recipient claimed. tx: ${claimRes.hash}`);
  log("RECEIVE", `Explorer: ${EXPLORER_TX}${claimRes.hash}`);

  // 7) Validate.
  const senderAfter = await nativeBalance(sender.publicKey());
  const recipientAfter = await nativeBalance(recipient.publicKey());
  const amount = Number(AMOUNT);

  const recipientDelta = recipientAfter - recipientBefore;
  const senderDelta = senderAfter - senderBefore;
  const claimFee = feeXlm(1);
  const createFee = feeXlm(1);

  log("BALANCE", `Sender after:    ${senderAfter} XLM   (delta ${senderDelta.toFixed(7)})`);
  log("BALANCE", `Recipient after: ${recipientAfter} XLM   (delta ${recipientDelta.toFixed(7)})`);
  log("FEES", `Create fee: ${createFee} XLM · Claim fee: ${claimFee} XLM`);

  // Recipient should gain ~AMOUNT minus their claim fee.
  const recipientOk = Math.abs(recipientDelta - (amount - claimFee)) < 1e-4;
  // Sender should lose ~AMOUNT plus create fee (the base reserve is refunded on claim).
  const senderOk = Math.abs(senderDelta - (-amount - createFee)) < 1e-3;

  console.log("\n=== RESULT ===");
  console.log(`Recipient received the funds: ${recipientOk ? "PASS" : "FAIL"}`);
  console.log(`Sender debited correctly:     ${senderOk ? "PASS" : "FAIL"}`);

  if (!recipientOk || !senderOk) {
    console.error("\nE2E FAILED — deltas did not match expectations.");
    process.exit(1);
  }
  console.log("\nE2E PASSED ✔  Full fund -> send -> receive verified on-chain.");
}

main().catch((err) => {
  console.error("\nE2E ERROR:", err?.response?.data ?? err);
  process.exit(1);
});
