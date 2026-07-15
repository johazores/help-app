import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const PRISMA_VERSION = "6.19.3";
const TESTNET_USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

const prisma = new PrismaClient();

/**
 * Application defaults required for a fresh database to serve requests.
 * Existing rows are never overwritten by these defaults.
 */
const defaultSettings = {
  "stellar.horizonUrl": "https://horizon-testnet.stellar.org",
  "stellar.friendbotUrl": "https://friendbot.stellar.org",
  "stellar.networkPassphrase": "Test SDF Network ; September 2015",
  "stellar.network": "testnet",
  "stellar.explorerTxUrl": "https://stellar.expert/explorer/testnet/tx/",
  "stellar.explorerAccountUrl": "https://stellar.expert/explorer/testnet/account/",
  "stellar.heldAsset": "USDC",
  "stellar.usdcCode": "USDC",
  "stellar.usdcIssuer": TESTNET_USDC_ISSUER,
  "rates.url": "https://api.coingecko.com/api/v3/simple/price",
  "rates.coinId": "usd-coin",
  "rates.currencies": "php,usd,eur,sar,aed,sgd,hkd",
};

/**
 * These environment variables intentionally override their matching rows.
 * Missing variables leave the current database values unchanged.
 */
const environmentSettings = {
  STELLAR_HORIZON_URL: "stellar.horizonUrl",
  STELLAR_FRIENDBOT_URL: "stellar.friendbotUrl",
  STELLAR_NETWORK_PASSPHRASE: "stellar.networkPassphrase",
  STELLAR_NETWORK: "stellar.network",
  STELLAR_EXPLORER_TX_URL: "stellar.explorerTxUrl",
  STELLAR_EXPLORER_ACCOUNT_URL: "stellar.explorerAccountUrl",
  STELLAR_HELD_ASSET: "stellar.heldAsset",
  STELLAR_USDC_CODE: "stellar.usdcCode",
  STELLAR_USDC_ISSUER: "stellar.usdcIssuer",
  RATES_URL: "rates.url",
  RATES_COIN_ID: "rates.coinId",
  RATES_CURRENCIES: "rates.currencies",
  SMTP_HOST: "smtp.host",
  SMTP_PORT: "smtp.port",
  SMTP_USER: "smtp.user",
  SMTP_PASS: "smtp.pass",
  SMTP_FROM: "smtp.from",
};

function pushSchema() {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(
    npmCommand,
    [
      "exec",
      "--yes",
      `--package=prisma@${PRISMA_VERSION}`,
      "--",
      "prisma",
      "db",
      "push",
      "--skip-generate",
    ],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`prisma db push exited with status ${result.status ?? "unknown"}.`);
  }
}

function configuredOverrides() {
  return Object.entries(environmentSettings).flatMap(([environmentKey, settingKey]) => {
    const value = process.env[environmentKey]?.trim();
    return value ? [[settingKey, value]] : [];
  });
}

async function ensureRequiredSettings() {
  await prisma.$transaction(
    Object.entries(defaultSettings).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: {},
        create: { key, value },
      }),
    ),
  );

  const overrides = configuredOverrides();
  if (overrides.length > 0) {
    await prisma.$transaction(
      overrides.map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        }),
      ),
    );
  }

  return overrides.length;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    if (process.env.VERCEL === "1") {
      throw new Error("DATABASE_URL is required for the Vercel database sync.");
    }

    console.log("DATABASE_URL is not set; skipping database synchronization.");
    return;
  }

  console.log("Synchronizing the Prisma schema with the configured database…");
  pushSchema();

  const overrideCount = await ensureRequiredSettings();
  console.log(
    `Database sync complete: ${Object.keys(defaultSettings).length} required settings checked, ${overrideCount} environment override(s) applied.`,
  );
}

main()
  .catch((error) => {
    console.error("Database synchronization failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
