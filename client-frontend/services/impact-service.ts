import { apiClient } from "@/services/api-client";
import type { ImpactStats } from "@/services/types";

class ImpactService {
  async stats(): Promise<ImpactStats> {
    return apiClient.request<ImpactStats>("/stats", { auth: false });
  }
}

export const impactService = new ImpactService();
