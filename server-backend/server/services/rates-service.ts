import { ApiError } from "@/lib/api";
import { settingsService } from "@/server/services/settings-service";

export interface RateSource {
  name: string;
  url: string;
}

export interface RatesPayload {
  base: "XLM" | "USDC";
  rates: Record<string, number>;
  fetchedAt: string;
  stale: boolean;
  sources: RateSource[];
}

type CachedRates = {
  key: string;
  payload: RatesPayload;
  at: number;
};

const CACHE_MS = 5 * 60_000;
const FRANKFURTER_URL = "https://api.frankfurter.dev/v2/rates";
const COINBASE_XLM_URL = "https://api.coinbase.com/v2/exchange-rates?currency=XLM";

class RatesService {
  private cache: CachedRates | null = null;

  private async fetchUsdFiatRates(
    fiatUrl: string,
    currencies: string[],
  ): Promise<{ rates: Record<string, number>; source: RateSource }> {
    try {
      const response = await fetch(fiatUrl, { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error(`Fiat provider returned ${response.status}`);
      const data = (await response.json()) as {
        result?: string;
        rates?: Record<string, number>;
      };
      if (data.result === "error" || !data.rates) throw new Error("Fiat provider returned no rates");

      const rates: Record<string, number> = { USD: 1, USDC: 1 };
      for (const currency of currencies) {
        const code = currency.toUpperCase();
        if (code === "USD" || code === "USDC") continue;
        const value = data.rates[code];
        if (typeof value === "number" && Number.isFinite(value)) rates[code] = value;
      }
      return {
        rates,
        source: { name: "ExchangeRate-API", url: "https://www.exchangerate-api.com" },
      };
    } catch (primaryError) {
      const quotes = currencies
        .map((currency) => currency.toUpperCase())
        .filter((currency) => currency !== "USD" && currency !== "USDC")
        .join(",");
      const fallbackUrl = `${FRANKFURTER_URL}?base=USD&quotes=${encodeURIComponent(quotes)}`;
      const response = await fetch(fallbackUrl, { headers: { accept: "application/json" } });
      if (!response.ok) throw primaryError;
      const data = (await response.json()) as unknown;
      const rates: Record<string, number> = { USD: 1, USDC: 1 };

      if (Array.isArray(data)) {
        for (const row of data as Array<{ quote?: unknown; rate?: unknown }>) {
          if (typeof row.quote === "string" && typeof row.rate === "number" && Number.isFinite(row.rate)) {
            rates[row.quote.toUpperCase()] = row.rate;
          }
        }
      } else if (data && typeof data === "object" && "rates" in data) {
        const values = (data as { rates?: Record<string, unknown> }).rates ?? {};
        for (const [code, value] of Object.entries(values)) {
          if (typeof value === "number" && Number.isFinite(value)) rates[code.toUpperCase()] = value;
        }
      }

      if (Object.keys(rates).length <= 2) throw primaryError;
      return {
        rates,
        source: { name: "Frankfurter", url: "https://frankfurter.dev" },
      };
    }
  }

  private async fetchXlmUsd(
    url: string,
    coinId: string,
  ): Promise<{ price: number; source: RateSource }> {
    try {
      const query = `${url}?ids=${encodeURIComponent(coinId)}&vs_currencies=usd&include_last_updated_at=true`;
      const headers: Record<string, string> = { accept: "application/json" };
      if (process.env.COINGECKO_API_KEY) {
        headers["x-cg-demo-api-key"] = process.env.COINGECKO_API_KEY;
      }
      const response = await fetch(query, { headers });
      if (!response.ok) throw new Error(`CoinGecko returned ${response.status}`);
      const data = (await response.json()) as Record<string, { usd?: unknown }>;
      const price = data[coinId]?.usd;
      if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
        throw new Error("CoinGecko returned no XLM price");
      }
      return {
        price,
        source: { name: "CoinGecko", url: "https://www.coingecko.com" },
      };
    } catch (primaryError) {
      const response = await fetch(COINBASE_XLM_URL, { headers: { accept: "application/json" } });
      if (!response.ok) throw primaryError;
      const data = (await response.json()) as { data?: { rates?: Record<string, string> } };
      const price = Number(data.data?.rates?.USD);
      if (!Number.isFinite(price) || price <= 0) throw primaryError;
      return {
        price,
        source: { name: "Coinbase", url: "https://www.coinbase.com" },
      };
    }
  }

  async get(): Promise<RatesPayload> {
    const [{ url, fiatUrl, coinId, currencies }, assetCfg] = await Promise.all([
      settingsService.rates(),
      settingsService.asset(),
    ]);
    const base: "XLM" | "USDC" = assetCfg.heldAsset;
    const cacheKey = `${base}:${url}:${fiatUrl}:${coinId}:${currencies.join(",")}`;

    if (this.cache?.key === cacheKey && Date.now() - this.cache.at < CACHE_MS) {
      return this.cache.payload;
    }

    try {
      const fiat = await this.fetchUsdFiatRates(fiatUrl, currencies);
      const rates: Record<string, number> = {};
      const sources: RateSource[] = [fiat.source];

      if (base === "USDC") {
        rates.USDC = 1;
        rates.USD = 1;
        for (const currency of currencies) {
          const code = currency.toUpperCase();
          const value = fiat.rates[code];
          if (typeof value === "number") rates[code] = value;
        }
      } else {
        const xlm = await this.fetchXlmUsd(url, coinId);
        sources.push(xlm.source);
        rates.XLM = 1;
        rates.USD = xlm.price;
        rates.USDC = xlm.price;
        for (const currency of currencies) {
          const code = currency.toUpperCase();
          const usdRate = fiat.rates[code];
          if (typeof usdRate === "number") rates[code] = xlm.price * usdRate;
        }
      }

      const payload: RatesPayload = {
        base,
        rates,
        fetchedAt: new Date().toISOString(),
        stale: false,
        sources,
      };
      this.cache = { key: cacheKey, payload, at: Date.now() };
      return payload;
    } catch (error) {
      if (this.cache?.key === cacheKey) {
        return { ...this.cache.payload, stale: true };
      }
      console.error("Rates fetch failed:", error);
      throw new ApiError(502, "Currency estimates aren't available right now. Please try again shortly.");
    }
  }
}

export const ratesService = new RatesService();