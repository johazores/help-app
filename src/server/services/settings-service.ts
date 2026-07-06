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

class SettingsService {
  private cache: Map<string, string> = new Map();

  private async get(key: string): Promise<string> {
    if (this.cache.has(key)) return this.cache.get(key)!;
    const row = await prisma.setting.findUnique({ where: { key } });
    if (!row) throw new ApiError(500, `Missing configuration: ${key}. Run the seed script.`);
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
}

export const settingsService = new SettingsService();
