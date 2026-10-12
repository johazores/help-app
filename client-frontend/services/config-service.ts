import { apiClient } from "@/services/api-client";
import type { AppConfig } from "@/services/types";

class ConfigService {
  private cached: AppConfig | null = null;

  /** The already-loaded config, if any, so screens can render it without waiting. */
  peek(): AppConfig | null {
    return this.cached;
  }

  async get(): Promise<AppConfig> {
    if (this.cached) return this.cached;
    this.cached = await apiClient.request<AppConfig>("/config", { auth: false });
    return this.cached;
  }
}

export const configService = new ConfigService();
