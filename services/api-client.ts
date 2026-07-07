const USER_TOKEN_KEY = "sagip.token";
const ADMIN_TOKEN_KEY = "sagip.admin.token";

type Scope = "user" | "admin";

/** Low-level HTTP client shared by every client service. Two token scopes. */
class ApiClient {
  private key(scope: Scope): string {
    return scope === "admin" ? ADMIN_TOKEN_KEY : USER_TOKEN_KEY;
  }

  getToken(scope: Scope = "user"): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(this.key(scope));
  }

  setToken(token: string, scope: Scope = "user"): void {
    if (typeof window !== "undefined") window.localStorage.setItem(this.key(scope), token);
  }

  clearToken(scope: Scope = "user"): void {
    if (typeof window !== "undefined") window.localStorage.removeItem(this.key(scope));
  }

  async request<T>(
    path: string,
    options: { method?: string; body?: unknown; auth?: boolean; scope?: Scope } = {},
  ): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (options.auth !== false) {
      const token = this.getToken(options.scope ?? "user");
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`/api${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const text = await res.text();
    let data: { error?: string } | null = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      throw new Error(data?.error || "Something went wrong. Please try again.");
    }
    return data as T;
  }
}

export const apiClient = new ApiClient();
