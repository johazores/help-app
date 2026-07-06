import { apiClient } from "@/services/api-client";
import type { ClaimInfo } from "@/services/types";

class ClaimService {
  async lookup(code: string): Promise<ClaimInfo> {
    return apiClient.request<ClaimInfo>(`/claim/${code}`, { auth: false });
  }

  async claim(code: string): Promise<{ amount: string; forName: string }> {
    return apiClient.request<{ amount: string; forName: string }>(`/claim/${code}`, {
      method: "POST",
      auth: false,
    });
  }
}

export const claimService = new ClaimService();
