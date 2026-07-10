import { apiClient } from "@/services/api-client";
import type { Rates } from "@/services/types";

const CACHE_MS = 60_000;

/** Client-side rates cache — mirrors server TTL and deduplicates in-flight requests. */
class RatesService {
  private cached: Rates | null = null;
  private cachedAt = 0;
  private inflight: Promise<Rates> | null = null;

  async get(): Promise<Rates> {
    if (this.cached && Date.now() - this.cachedAt < CACHE_MS) {
      return this.cached;
    }
    if (this.inflight) return this.inflight;

    this.inflight = apiClient
      .request<Rates>("/rates", { auth: false })
      .then((rates) => {
        this.cached = rates;
        this.cachedAt = Date.now();
        return rates;
      })
      .finally(() => {
        this.inflight = null;
      });

    return this.inflight;
  }
}

export const ratesService = new RatesService();
