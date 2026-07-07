import { apiClient } from "@/services/api-client";
import type { AdminOverview } from "@/services/types";

class AdminService {
  async overview(): Promise<AdminOverview> {
    return apiClient.request<AdminOverview>("/admin/overview");
  }
}

export const adminService = new AdminService();
