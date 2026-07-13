import { apiClient } from "@/services/api-client";

class AccountService {
  async updateName(name: string): Promise<{ name: string }> {
    return apiClient.request("/account/profile", { method: "PATCH", body: { name } });
  }

  async updateAvatar(avatar: string | null): Promise<void> {
    await apiClient.request("/account/avatar", { method: "PATCH", body: { avatar } });
  }

  async requestEmail(email: string): Promise<{ sentTo: string }> {
    return apiClient.request("/account/email-request", { method: "POST", body: { email } });
  }

  async confirmEmail(code: string): Promise<{ email: string; emailVerified: boolean }> {
    return apiClient.request("/account/email-confirm", { method: "POST", body: { code } });
  }

  async changePin(currentPin: string, newPin: string): Promise<void> {
    await apiClient.request("/account/change-pin", { method: "POST", body: { currentPin, newPin } });
  }
}

export const accountService = new AccountService();
