import { apiClient } from "@/services/api-client";
import type { SafetyNet, SafetyNetDetail } from "@/services/types";

class SafetyNetService {
  async list(): Promise<SafetyNet[]> {
    return apiClient.request<SafetyNet[]>("/safety-nets");
  }

  async detail(id: string): Promise<SafetyNetDetail> {
    return apiClient.request<SafetyNetDetail>(`/safety-nets/${id}`);
  }

  async create(input: {
    label: string;
    amount: string;
    recipientId: string;
    checkInIntervalDays: number;
  }): Promise<SafetyNet> {
    return apiClient.request<SafetyNet>("/safety-nets", { method: "POST", body: input });
  }

  async checkIn(id: string): Promise<SafetyNet> {
    return apiClient.request<SafetyNet>(`/safety-nets/${id}/check-in`, { method: "POST" });
  }

  async close(id: string): Promise<SafetyNet> {
    return apiClient.request<SafetyNet>(`/safety-nets/${id}/close`, { method: "POST" });
  }
}

export const safetyNetService = new SafetyNetService();
