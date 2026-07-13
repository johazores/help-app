/** Thrown by apiClient when the server returns a non-2xx status or the network fails. */
export class ApiRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiRequestError && err.status === 401;
}

export function isWalletRequired(err: unknown): boolean {
  if (!(err instanceof ApiRequestError)) return false;
  return err.message.toLowerCase().includes("wallet");
}

export function loadErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

/** Sign out only on 401; redirect to wallet setup when the API says no wallet. */
export function handleProtectedLoadError(
  err: unknown,
  router: { replace: (path: string) => void },
  signOut: () => void | Promise<void>,
): "auth" | "wallet" | "error" {
  if (isUnauthorized(err)) {
    void signOut();
    router.replace("/sign-in");
    return "auth";
  }
  if (isWalletRequired(err)) {
    router.replace("/wallet-setup");
    return "wallet";
  }
  return "error";
}
