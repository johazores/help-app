import { apiClient } from "@/services/api-client";
import type { DepositInfo, WalletInfo } from "@/services/types";

class WalletService {
  async list(): Promise<WalletInfo[]> {
    return apiClient.request<WalletInfo[]>("/wallets");
  }

  async create(name?: string): Promise<{ wallet: WalletInfo; recoveryKey: string }> {
    return apiClient.request("/wallets", { method: "POST", body: { name } });
  }

  async import(secretKey: string, name?: string): Promise<{ wallet: WalletInfo }> {
    return apiClient.request("/wallets/import", { method: "POST", body: { secretKey, name } });
  }

  async rename(id: string, name: string): Promise<void> {
    await apiClient.request(`/wallets/${id}`, { method: "PATCH", body: { name } });
  }

  async activate(id: string): Promise<void> {
    await apiClient.request(`/wallets/${id}/activate`, { method: "POST" });
  }

  async reveal(id: string, pin: string): Promise<{ recoveryKey: string }> {
    return apiClient.request(`/wallets/${id}/reveal`, { method: "POST", body: { pin } });
  }

  async depositInfo(): Promise<DepositInfo> {
    return apiClient.request<DepositInfo>("/wallet/deposit-info");
  }

  async addTestFunds(amount: number): Promise<{ balance: string; txHash: string }> {
    return apiClient.request("/wallet/add-test-funds", { method: "POST", body: { amount } });
  }
}

export const walletService = new WalletService();
