import { apiClient } from "@/services/api-client";
import type { Recipient } from "@/services/types";

class RecipientService {
  async list(): Promise<Recipient[]> {
    return apiClient.request<Recipient[]>("/recipients");
  }

  async create(input: { name: string; relationship: string; phone?: string }): Promise<Recipient> {
    return apiClient.request<Recipient>("/recipients", { method: "POST", body: input });
  }
}

export const recipientService = new RecipientService();
