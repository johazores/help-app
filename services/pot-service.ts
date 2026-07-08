import { apiClient } from "@/services/api-client";
import type { Pot } from "@/services/types";

class PotService {
  async list(): Promise<Pot[]> {
    return apiClient.request<Pot[]>("/pots");
  }
  async create(name: string, target: string): Promise<Pot> {
    return apiClient.request<Pot>("/pots", { method: "POST", body: { name, target } });
  }
  async addTo(id: string, amount: string): Promise<{ saved: string }> {
    return apiClient.request(`/pots/${id}`, { method: "POST", body: { amount } });
  }
  async remove(id: string): Promise<void> {
    await apiClient.request(`/pots/${id}`, { method: "DELETE" });
  }
}

export const potService = new PotService();
