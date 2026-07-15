import { apiClient } from "@/services/api-client";

export type HealthStatus = {
  ok: boolean;
  db: boolean;
  stellar: boolean;
  ms: number;
};

const CACHE_MS = 30_000;

class HealthService {
  private cached: HealthStatus | null = null;
  private cachedAt = 0;
  private inflight: Promise<HealthStatus> | null = null;

  check(force = false): Promise<HealthStatus> {
    if (!force && this.cached && Date.now() - this.cachedAt < CACHE_MS) {
      return Promise.resolve(this.cached);
    }
    if (this.inflight) return this.inflight;

    this.inflight = apiClient
      .request<HealthStatus>("/health", { auth: false })
      .then((status) => {
        this.cached = status;
        this.cachedAt = Date.now();
        return status;
      })
      .finally(() => {
        this.inflight = null;
      });

    return this.inflight;
  }
}

export const healthService = new HealthService();
