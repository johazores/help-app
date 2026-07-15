import { apiClient } from "@/services/api-client";
import type { Profile, SessionInfo } from "@/services/types";

interface AuthResult {
  token: string;
  user: { id: string; name: string; phone: string };
  verificationSent?: boolean;
}

class AuthService {
  async signUp(input: { name: string; phone: string; pin: string; email?: string }): Promise<AuthResult> {
    const result = await apiClient.request<AuthResult>("/auth/sign-up", {
      method: "POST",
      body: input,
      auth: false,
    });
    apiClient.setToken(result.token);
    return result;
  }

  async signIn(input: { phone: string; pin: string }): Promise<AuthResult> {
    const result = await apiClient.request<AuthResult>("/auth/sign-in", {
      method: "POST",
      body: input,
      auth: false,
    });
    apiClient.setToken(result.token);
    return result;
  }

  async me(): Promise<Profile> {
    return apiClient.request<Profile>("/auth/me");
  }

  isSignedIn(): boolean {
    return Boolean(apiClient.getToken());
  }

  async signOut(): Promise<void> {
    try {
      await apiClient.request("/auth/sign-out", { method: "POST" });
    } catch {
      // Even if the network call fails, clear the local token.
    }
    apiClient.clearToken();
  }

  async sessions(): Promise<SessionInfo[]> {
    return apiClient.request<SessionInfo[]>("/auth/sessions");
  }

  async revokeSession(sessionId: string): Promise<void> {
    await apiClient.request("/auth/sessions", { method: "DELETE", body: { sessionId } });
  }

  async revokeAllOtherSessions(): Promise<void> {
    await apiClient.request("/auth/sessions", { method: "DELETE", body: { all: true } });
  }

  async forgotPin(phone: string): Promise<void> {
    await apiClient.request("/auth/forgot-pin", { method: "POST", body: { phone }, auth: false });
  }

  async resetPin(phone: string, code: string, newPin: string): Promise<void> {
    await apiClient.request("/auth/reset-pin", {
      method: "POST",
      body: { phone, code, newPin },
      auth: false,
    });
  }
}

export const authService = new AuthService();
