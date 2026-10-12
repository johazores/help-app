import { apiClient } from "@/services/api-client";
import type { ClaimInfo, RecoveredClaimLink } from "@/services/types";

class ClaimService {
  async lookup(code: string): Promise<ClaimInfo> {
    return apiClient.request<ClaimInfo>(`/claim/${code}`, { auth: false });
  }

  async claim(code: string): Promise<{
    amount: string;
    forName: string;
    backupName?: string;
    guarded: boolean;
    guardUnlockAt?: string;
    txHash: string;
  }> {
    return apiClient.request(`/claim/${code}`, {
      method: "POST",
      auth: false,
    });
  }

  async receiverCheckIn(code: string): Promise<{ guardUnlockAt: string; backupName: string; txHash: string }> {
    return apiClient.request(`/claim/${code}/check-in`, { method: "POST", auth: false });
  }

  async backupClaim(code: string): Promise<{ amount: string; forName: string; primaryName: string; txHash: string }> {
    return apiClient.request(`/claim/${code}/backup`, { method: "POST", auth: false });
  }

  /** Finds claim links again using the loved one's number and the sender's number. */
  async recover(phone: string, senderPhone: string): Promise<RecoveredClaimLink[]> {
    return apiClient.request<RecoveredClaimLink[]>("/claim/recover", {
      method: "POST",
      body: { phone, senderPhone },
      auth: false,
    });
  }

  async requestEarly(code: string): Promise<void> {
    await apiClient.request(`/claim/${code}/request`, { method: "POST", auth: false });
  }
}

export const claimService = new ClaimService();
