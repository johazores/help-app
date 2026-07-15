import { ApiRequestError } from "@/lib/api-errors";

const USER_TOKEN_KEY = "sagip.token";
const ADMIN_TOKEN_KEY = "sagip.admin.token";
const DEFAULT_TIMEOUT_MS = 15_000;

type Scope = "user" | "admin";

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  scope?: Scope;
  timeoutMs?: number;
  dedupe?: boolean;
  signal?: AbortSignal;
};

function apiErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object" || !("error" in data)) return null;
  const error = (data as { error?: unknown }).error;
  return typeof error === "string" && error.trim() ? error : null;
}

/** Low-level HTTP client shared by every client service. Two token scopes. */
class ApiClient {
  private readonly inflight = new Map<string, Promise<unknown>>();

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

  request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = (options.method ?? "GET").toUpperCase();
    const scope = options.scope ?? "user";
    const token = options.auth === false ? null : this.getToken(scope);
    const shouldDedupe = (options.dedupe ?? method === "GET") && options.body === undefined;
    const requestKey = shouldDedupe
      ? `${method}:${path}:${options.auth === false ? "public" : `${scope}:${token ?? "anonymous"}`}`
      : null;

    if (requestKey) {
      const existing = this.inflight.get(requestKey);
      if (existing) return existing as Promise<T>;
    }

    const request = this.execute<T>(path, method, token, options);

    if (requestKey) {
      this.inflight.set(requestKey, request);
      request.then(
        () => {
          if (this.inflight.get(requestKey) === request) this.inflight.delete(requestKey);
        },
        () => {
          if (this.inflight.get(requestKey) === request) this.inflight.delete(requestKey);
        },
      );
    }

    return request;
  }

  private async execute<T>(
    path: string,
    method: string,
    token: string | null,
    options: RequestOptions,
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const callerSignal = options.signal;
    const timeoutMs = Math.max(1_000, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    let timedOut = false;

    const abortFromCaller = () => controller.abort();
    if (callerSignal?.aborted) controller.abort();
    else callerSignal?.addEventListener("abort", abortFromCaller, { once: true });

    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    let res: Response;
    try {
      // Same-origin only — /api is proxied to the backend via client proxy.ts (no CORS).
      res = await fetch(`/api${path}`, {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } catch {
      if (timedOut) {
        throw new ApiRequestError(0, "The server took too long to respond. Please try again.");
      }
      if (callerSignal?.aborted) {
        throw new ApiRequestError(0, "The request was cancelled.");
      }
      throw new ApiRequestError(0, "Can't reach the server. Check your connection and try again.");
    } finally {
      clearTimeout(timeout);
      callerSignal?.removeEventListener("abort", abortFromCaller);
    }

    const text = res.status === 204 ? "" : await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      throw new ApiRequestError(
        res.status,
        apiErrorMessage(data) ?? "Something went wrong. Please try again.",
      );
    }

    return data as T;
  }
}

export { ApiRequestError };
export const apiClient = new ApiClient();
