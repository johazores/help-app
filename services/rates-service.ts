import { apiClient } from "@/services/api-client";
import type { Rates } from "@/services/types";

class RatesService {
  async get(): Promise<Rates> {
    return apiClient.request<Rates>("/rates", { auth: false });
  }
}

export const ratesService = new RatesService();
