import { apiClient } from "@/services/api-client";

export type HealthStatus = {
  ok: boolean;
  db: boolean;
  stellar: boolean;
  ms: number;
};

export const healthService = {
  check(): Promise<HealthStatus> {
    return apiClient.request<HealthStatus>("/health", { auth: false });
  },
};
