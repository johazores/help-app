import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";

/**
 * All runtime configuration (network endpoints, third-party credentials) lives
 * in the Setting table so nothing sensitive is hard-coded. Seeded in prisma/seed.ts.
 */
export interface StellarConfig {
  horizonUrl: string;
  friendbotUrl: string;
  networkPassphrase: string;
}

export interface AssetConfig {
  /** XLM or USDC — the asset safety nets and balances use. */
  heldAsset: "XLM" | "USDC";
  usdcCode: string;
  usdcIssuer: string;
  /** StellarAccount id for the USDC treasury (testnet bootstrap). */
  treasuryAccountId: string | null;
}

export interface ExplorerConfig {
  network: string;
  explorerTxUrl: string;
  explorerAccountUrl: string;
}

export interface RatesConfig {
  url: string;
  fiatUrl: string;
  coinId: string;
  currencies: string[];
}

class SettingsService {
  private cache: Map<string, string> = new Map();

  private async get(key: string): Promise<string> {
    if (this.cache.has(key)) return this.cache.get(key)!;
    const row = await prisma.setting.findUnique({ where: { key } });
    if (!row) throw new ApiError(500, `Missing configuration: ${key}. Run the database sync.`);
    this.cache.set(key, row.value);
    return row.value;
  }

  async stellar(): Promise<StellarConfig> {
    const [horizonUrl, friendbotUrl, networkPassphrase] = await Promise.all([
      this.get("stellar.horizonUrl"),
      this.get("stellar.friendbotUrl"),
      this.get("stellar.networkPassphrase"),
    ]);
    return { horizonUrl, friendbotUrl, networkPassphrase };
  }

  async explorer(): Promise<ExplorerConfig> {
    const [network, explorerTxUrl, explorerAccountUrl] = await Promise.all([
      this.get("stellar.network"),
      this.get("stellar.explorerTxUrl"),
      this.get("stellar.explorerAccountUrl"),
    ]);
    return { network, explorerTxUrl, explorerAccountUrl };
  }

  async rates(): Promise<RatesConfig> {
    const [url, fiatUrl, coinId, currencies] = await Promise.all([
      this.get("rates.url"),
      this.get("rates.fiatUrl"),
      this.get("rates.coinId"),
      this.get("rates.currencies"),
    ]);
    return { url, fiatUrl, coinId, currencies: currencies.split(",").map((c) => c.trim()) };
  }

  private async getOptional(key: string): Promise<string | null> {
    if (this.cache.has(key)) return this.cache.get(key)!;
    const row = await prisma.setting.findUnique({ where: { key } });
    if (!row) return null;
    this.cache.set(key, row.value);
    return row.value;
  }

  async asset(): Promise<AssetConfig> {
    const [heldAsset, usdcCode, usdcIssuer, treasuryAccountId] = await Promise.all([
      this.get("stellar.heldAsset"),
      this.get("stellar.usdcCode"),
      this.get("stellar.usdcIssuer"),
      this.getOptional("stellar.treasuryAccountId"),
    ]);
    return {
      heldAsset: heldAsset === "USDC" ? "USDC" : "XLM",
      usdcCode,
      usdcIssuer,
      treasuryAccountId,
    };
  }

  /**
   * A fresh Vercel database has no funded USDC treasury. On testnet, fall back
   * to XLM so Friendbot-backed top-ups remain usable instead of attempting an
   * impossible USDC payment from an XLM-only relay account.
   */
  async ensureTestFundingReady(): Promise<{ switchedToXlm: boolean }> {
    const [{ network }, asset] = await Promise.all([this.explorer(), this.asset()]);

    if (network.toLowerCase() === "public") {
      throw new ApiError(400, "Instant test funds are only available in the test environment.");
    }

    if (asset.heldAsset !== "USDC") {
      return { switchedToXlm: false };
    }

    const treasuryExists = asset.treasuryAccountId
      ? Boolean(
          await prisma.stellarAccount.findUnique({
            where: { id: asset.treasuryAccountId },
            select: { id: true },
          }),
        )
      : false;

    if (treasuryExists) {
      return { switchedToXlm: false };
    }

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

    this.clearCache();
    return { switchedToXlm: true };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const settingsService = new SettingsService();