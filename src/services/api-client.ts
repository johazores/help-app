const TOKEN_KEY = "sagip.token";

/** Low-level HTTP client shared by every client service. */
class ApiClient {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    if (typeof window !== "undefined") window.localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken(): void {
    if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
  }

  async request<T>(path: string, options: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (options.auth !== false) {
      const token = this.getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`/api${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok) {
      const message = (data && data.error) || "Something went wrong. Please try again.";
      throw new Error(message);
    }
    return data as T;
  }
}

export const apiClient = new ApiClient();
