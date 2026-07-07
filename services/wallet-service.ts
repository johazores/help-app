import { apiClient } from "@/services/api-client";
import type { DepositInfo } from "@/services/types";

class WalletService {
  async depositInfo(): Promise<DepositInfo> {
    return apiClient.request<DepositInfo>("/wallet/deposit-info");
  }

  async addTestFunds(amount: number): Promise<{ balance: string; txHash: string }> {
    return apiClient.request<{ balance: string; txHash: string }>("/wallet/add-test-funds", {
      method: "POST",
      body: { amount },
    });
  }
}

export const walletService = new WalletService();
