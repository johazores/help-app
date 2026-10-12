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

/** The API's "set up a wallet first" answer (409 from any money action without a wallet). */
export function isWalletRequired(err: unknown): boolean {
  return err instanceof ApiRequestError && err.status === 409 && /don't have a wallet yet/i.test(err.message);
}

/**
 * True when the server couldn't say whether money moved: a confirmation
 * timeout (504), or a confirmed transaction whose record failed (500 with the
 * "moved safely" message). Retrying could move the money twice, so screens
 * send the person to check their history instead.
 */
export function isUncertainOutcome(err: unknown): boolean {
  if (!(err instanceof ApiRequestError)) return false;
  return err.status === 504 || (err.status === 500 && /moved safely|was sent/i.test(err.message));
}

export const UNCERTAIN_OUTCOME_HELP =
  "Please don't try again yet. Check your home screen in a minute to see whether it went through.";

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
