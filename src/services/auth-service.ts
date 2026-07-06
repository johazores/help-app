import { apiClient } from "@/services/api-client";
import type { Profile } from "@/services/types";

interface AuthResult {
  token: string;
  user: { id: string; name: string; phone: string };
}

class AuthService {
  async signUp(input: { name: string; phone: string; pin: string }): Promise<AuthResult> {
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

  signOut(): void {
    apiClient.clearToken();
  }
}

export const authService = new AuthService();
