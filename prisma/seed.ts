import { PrismaClient } from "@prisma/client";

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

async function main() {
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
