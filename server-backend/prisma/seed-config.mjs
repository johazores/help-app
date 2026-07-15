import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TESTNET_USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

/**
 * Non-secret defaults required for the application to start.
 *
 * Existing values are deliberately preserved. This lets administrators change
 * runtime configuration in the database without a later deployment resetting it.
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
 * Environment-backed settings are the only values an automatic deployment may
 * update. Omitting an environment variable leaves the current database value intact.
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

async function main() {
  if (!process.env.DATABASE_URL) {
    if (process.env.VERCEL === "1") {
      throw new Error("DATABASE_URL is required to seed deployment configuration on Vercel.");
    }

    console.log("DATABASE_URL is not set; skipping the safe configuration seed.");
    return;
  }

  await prisma.$transaction(
    Object.entries(defaultSettings).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: {},
        create: { key, value },
      }),
    ),
  );

  const overrides = Object.entries(environmentSettings).flatMap(([environmentKey, settingKey]) => {
    const value = process.env[environmentKey]?.trim();
    return value ? [[settingKey, value]] : [];
  });

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

  console.log(
    `Safe configuration seed complete: ${Object.keys(defaultSettings).length} defaults checked, ${overrides.length} environment override(s) applied.`,
  );
}

main()
  .catch((error) => {
    console.error("Safe configuration seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
