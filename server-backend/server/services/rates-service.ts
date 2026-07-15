import { ApiError } from "@/lib/api";
import { settingsService } from "@/server/services/settings-service";

/**
 * Live market rates for XLM against fiat currencies (and USDC ≈ USD).
 * Source: CoinGecko simple-price API (no key). Cached briefly so we don't hit
 * rate limits, and so many users share one upstream call.
 */

export interface RatesPayload {
  base: "XLM" | "USDC";
  rates: Record<string, number>;
  fetchedAt: string;
  stale: boolean;
}

const CACHE_MS = 60_000;

class RatesService {
  private cache: { payload: RatesPayload; at: number } | null = null;

  async get(): Promise<RatesPayload> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) {
      return this.cache.payload;
    }

    const [{ url, coinId, currencies }, assetCfg] = await Promise.all([
      settingsService.rates(),
      settingsService.asset(),
    ]);
    const base: "XLM" | "USDC" = assetCfg.heldAsset;
    const query = `${url}?ids=${encodeURIComponent(coinId)}&vs_currencies=${encodeURIComponent(
      currencies.join(","),
    )}`;

    try {
      const res = await fetch(query, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`Rates provider returned ${res.status}`);
      const data = (await res.json()) as Record<string, Record<string, number>>;
      const raw = data[coinId];
      if (!raw) throw new Error(`Rates provider returned no data for ${coinId}`);

      const rates: Record<string, number> = {};
      for (const cur of currencies) {
        if (typeof raw[cur] === "number") rates[cur.toUpperCase()] = raw[cur];
      }
      // USDC tracks USD 1:1 for display purposes.
      if (rates.USD !== undefined) rates.USDC = rates.USD;

      const payload: RatesPayload = {
        base,
        rates,
        fetchedAt: new Date().toISOString(),
        stale: false,
      };
      this.cache = { payload, at: Date.now() };
      return payload;
    } catch (err) {
      // Serve the last good value if we have one, marked stale.
      if (this.cache) {
        return { ...this.cache.payload, stale: true };
      }
      console.error("Rates fetch failed:", err);
      throw new ApiError(502, "Live rates aren't available right now. Please try again shortly.");
    }
  }
}

export const ratesService = new RatesService();
