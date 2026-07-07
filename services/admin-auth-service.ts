import { apiClient } from "@/services/api-client";

interface AdminAuthResult {
  token: string;
  admin: { id: string; name: string; username: string };
}

class AdminAuthService {
  async signIn(identity: string, password: string): Promise<AdminAuthResult> {
    const result = await apiClient.request<AdminAuthResult>("/admin/sign-in", {
      method: "POST",
      body: { identity, password },
      auth: false,
    });
    apiClient.setToken(result.token, "admin");
    return result;
  }

  isSignedIn(): boolean {
    return Boolean(apiClient.getToken("admin"));
  }

  async signOut(): Promise<void> {
    try {
      await apiClient.request("/admin/sign-out", { method: "POST", scope: "admin" });
    } catch {
      // clear locally regardless
    }
    apiClient.clearToken("admin");
  }
}

export const adminAuthService = new AdminAuthService();
