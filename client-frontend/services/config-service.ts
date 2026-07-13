import { apiClient } from "@/services/api-client";
import type { AppConfig } from "@/services/types";

class ConfigService {
  private cached: AppConfig | null = null;

  async get(): Promise<AppConfig> {
    if (this.cached) return this.cached;
    this.cached = await apiClient.request<AppConfig>("/config", { auth: false });
    return this.cached;
  }
}

export const configService = new ConfigService();
