import { apiClient } from "@/services/api-client";
import type { Rates } from "@/services/types";

const CACHE_MS = 5 * 60_000;

/** Client-side rates cache — mirrors server TTL and deduplicates in-flight requests. */
class RatesService {
  private cached: Rates | null = null;
  private cachedAt = 0;
  private inflight: Promise<Rates> | null = null;

  async get(options: { force?: boolean } = {}): Promise<Rates> {
    if (!options.force && this.cached && Date.now() - this.cachedAt < CACHE_MS) {
      return this.cached;
    }
    if (this.inflight) return this.inflight;

    this.inflight = apiClient
      .request<Rates>("/rates", { auth: false, dedupe: !options.force })
      .then((rates) => {
        this.cached = rates;
        this.cachedAt = Date.now();
        return rates;
      })
      .catch((error) => {
        if (this.cached) return { ...this.cached, stale: true };
        throw error;
      })
      .finally(() => {
        this.inflight = null;
      });

    return this.inflight;
  }

  async refresh(): Promise<Rates> {
    return this.get({ force: true });
  }

  clear(): void {
    this.cached = null;
    this.cachedAt = 0;
  }
}

export const ratesService = new RatesService();