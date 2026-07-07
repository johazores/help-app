import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

// Network configuration is stored in the database so it can be changed without
// a redeploy and so nothing sensitive is hard-coded in the source.
const settings: Record<string, string> = {
  "stellar.horizonUrl": "https://horizon-testnet.stellar.org",
  "stellar.friendbotUrl": "https://friendbot.stellar.org",
  "stellar.networkPassphrase": "Test SDF Network ; September 2015",
  "stellar.network": "testnet",
  "stellar.explorerTxUrl": "https://stellar.expert/explorer/testnet/tx/",
  "stellar.explorerAccountUrl": "https://stellar.expert/explorer/testnet/account/",
  // Live market rates (CoinGecko simple price API — no key required).
  "rates.url": "https://api.coingecko.com/api/v3/simple/price",
  "rates.coinId": "stellar",
  "rates.currencies": "php,usd,eur,sar,aed,sgd,hkd",
};

function hashSecret(secret: string): string {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(secret, salt, 32).toString("hex")}`;
}

async function main() {
  // Optional SMTP settings (for verification / recovery emails), from env.
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

  // Bootstrap the root admin from env (updates password if re-run).
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
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
