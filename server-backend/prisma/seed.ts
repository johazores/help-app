import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";
import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { encryptSecret } from "../lib/crypto";

const prisma = new PrismaClient();

const TESTNET_USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const HORIZON = "https://horizon-testnet.stellar.org";
const FRIENDBOT = "https://friendbot.stellar.org";

const settings: Record<string, string> = {
  "stellar.horizonUrl": HORIZON,
  "stellar.friendbotUrl": FRIENDBOT,
  "stellar.networkPassphrase": Networks.TESTNET,
  "stellar.network": "testnet",
  "stellar.explorerTxUrl": "https://stellar.expert/explorer/testnet/tx/",
  "stellar.explorerAccountUrl": "https://stellar.expert/explorer/testnet/account/",
  "stellar.heldAsset": "USDC",
  "stellar.usdcCode": "USDC",
  "stellar.usdcIssuer": TESTNET_USDC_ISSUER,
  "rates.url": "https://api.coingecko.com/api/v3/simple/price",
  "rates.fiatUrl": "https://open.er-api.com/v6/latest/USD",
  "rates.coinId": "usd-coin",
  "rates.currencies": "php,usd,eur,sar,aed,sgd,hkd",
};

function hashSecret(secret: string): string {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(secret, salt, 32).toString("hex")}`;
}

async function fundFriendbot(publicKey: string): Promise<void> {
  const res = await fetch(`${FRIENDBOT}?addr=${encodeURIComponent(publicKey)}`);
  if (!res.ok) throw new Error(`Friendbot failed: ${res.status}`);
}

/** Bootstrap a USDC treasury for testnet top-ups and welcome bonuses. */
async function bootstrapTreasury(): Promise<void> {
  const existing = await prisma.setting.findUnique({ where: { key: "stellar.treasuryAccountId" } });
  if (existing?.value) {
    console.log("Treasury already configured.");
    return;
  }

  console.log("Bootstrapping USDC treasury on testnet…");
  const keypair = Keypair.random();
  await fundFriendbot(keypair.publicKey());

  const enc = encryptSecret(keypair.secret());
  const account = await prisma.stellarAccount.create({
    data: {
      publicKey: keypair.publicKey(),
      encryptedSecret: enc.cipherText,
      encryptionIv: enc.iv,
      encryptionTag: enc.tag,
    },
  });

  const server = new Horizon.Server(HORIZON);
  const usdc = new Asset("USDC", TESTNET_USDC_ISSUER);

  // Trustline for USDC.
  let acct = await server.loadAccount(keypair.publicKey());
  const tx1 = new TransactionBuilder(acct, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.changeTrust({ asset: usdc, limit: "922337203685.4775807" }))
    .setTimeout(60)
    .build();
  tx1.sign(keypair);
  await server.submitTransaction(tx1);

  // Swap XLM → USDC via path payment (best-effort on testnet SDEX).
  try {
    acct = await server.loadAccount(keypair.publicKey());
    const tx2 = new TransactionBuilder(acct, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
      .addOperation(
        Operation.pathPaymentStrictReceive({
          sendAsset: Asset.native(),
          sendMax: "50",
          destination: keypair.publicKey(),
          destAsset: usdc,
          destAmount: "50000",
          path: [],
        }),
      )
      .setTimeout(60)
      .build();
    tx2.sign(keypair);
    await server.submitTransaction(tx2);
    console.log("Treasury funded with USDC via path payment.");
  } catch (err) {
    console.warn("Path payment to USDC failed — falling back to XLM held asset.", err);
    await prisma.setting.upsert({
      where: { key: "stellar.heldAsset" },
      update: { value: "XLM" },
      create: { key: "stellar.heldAsset", value: "XLM" },
    });
    await prisma.setting.upsert({
      where: { key: "rates.coinId" },
      update: { value: "stellar" },
      create: { key: "rates.coinId", value: "stellar" },
    });
    return;
  }

  await prisma.setting.upsert({
    where: { key: "stellar.treasuryAccountId" },
    update: { value: account.id },
    create: { key: "stellar.treasuryAccountId", value: account.id },
  });
  console.log(`Treasury ready (${keypair.publicKey()}).`);
}

async function useFundableXlmFallback(): Promise<void> {
  await prisma.$transaction([
    prisma.setting.upsert({
      where: { key: "stellar.heldAsset" },
      update: { value: "XLM" },
      create: { key: "stellar.heldAsset", value: "XLM" },
    }),
    prisma.setting.upsert({
      where: { key: "rates.coinId" },
      update: { value: "stellar" },
      create: { key: "rates.coinId", value: "stellar" },
    }),
  ]);
  console.log("Treasury bootstrap skipped — using Friendbot-funded XLM for test flows.");
}

async function main() {
  for (const [envKey, settingKey] of [
    ["SMTP_HOST", "smtp.host"],
    ["SMTP_PORT", "smtp.port"],
    ["SMTP_USER", "smtp.user"],
    ["SMTP_PASS", "smtp.pass"],
    ["SMTP_FROM", "smtp.from"],
  ] as const) {
    const value = process.env[envKey];
    if (value) {
      await prisma.setting.upsert({
        where: { key: settingKey },
        update: { value },
        create: { key: settingKey, value },
      });
    }
  }

  const { ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
  if (ADMIN_USERNAME && ADMIN_EMAIL && ADMIN_PASSWORD) {
    await prisma.adminUser.upsert({
      where: { username: ADMIN_USERNAME },
      update: { email: ADMIN_EMAIL, passwordHash: hashSecret(ADMIN_PASSWORD) },
      create: {
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        name: ADMIN_NAME || "Administrator",
        passwordHash: hashSecret(ADMIN_PASSWORD),
      },
    });
    console.log(`Admin '${ADMIN_USERNAME}' is ready.`);
  } else {
    console.log("No ADMIN_USERNAME/ADMIN_EMAIL/ADMIN_PASSWORD in env — skipping admin bootstrap.");
  }

  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  console.log(`Seeded ${Object.keys(settings).length} settings.`);

  if (process.env.SKIP_TREASURY !== "1") {
    await bootstrapTreasury();
  } else {
    await useFundableXlmFallback();
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });