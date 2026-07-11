import { apiClient } from "@/services/api-client";
import type { SafetyNet, SafetyNetCardSummary, SafetyNetDetail } from "@/services/types";

class SafetyNetService {
  async list(): Promise<SafetyNet[]> {
    return apiClient.request<SafetyNet[]>("/safety-nets");
  }

  async detail(id: string): Promise<SafetyNetDetail> {
    return apiClient.request<SafetyNetDetail>(`/safety-nets/${id}`);
  }

  async cardSummary(id: string): Promise<SafetyNetCardSummary> {
    return apiClient.request<SafetyNetCardSummary>(`/safety-nets/${id}/card`);
  }

  async create(input: {
    label: string;
    amount: string;
    recipientId: string;
    checkInIntervalMinutes?: number;
    backupRecipientId?: string;
    postReceiptCheckInIntervalMinutes?: number;
    kind?: string;
    opensAt?: string;
  }): Promise<SafetyNet> {
    return apiClient.request<SafetyNet>("/safety-nets", { method: "POST", body: input });
  }

  async checkIn(id: string): Promise<SafetyNet> {
    return apiClient.request<SafetyNet>(`/safety-nets/${id}/check-in`, { method: "POST" });
  }

  async close(id: string): Promise<SafetyNet> {
    return apiClient.request<SafetyNet>(`/safety-nets/${id}/close`, { method: "POST" });
  }

  async approveEarly(id: string): Promise<SafetyNet> {
    return apiClient.request<SafetyNet>(`/safety-nets/${id}/early-request`, { method: "POST" });
  }

  async dismissEarly(id: string): Promise<void> {
    await apiClient.request(`/safety-nets/${id}/early-request`, { method: "DELETE" });
  }
}

export const safetyNetService = new SafetyNetService();
