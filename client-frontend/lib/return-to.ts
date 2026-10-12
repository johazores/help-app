const KEY = "sagip.returnTo";

/** Only same-site paths are accepted, so this can never redirect off Sagip. */
function isSafePath(path: string | null): path is string {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//"));
}

/** Remembers where to send someone after they sign in or finish setting up. */
export function rememberReturnTo(path: string): void {
  try {
    if (isSafePath(path)) window.sessionStorage.setItem(KEY, path);
  } catch {
    // Storage can be unavailable (private mode); the flow still ends at /home.
  }
}

/** Returns and forgets the remembered path, or the fallback. */
export function takeReturnTo(fallback = "/home"): string {
  try {
    const path = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    return isSafePath(path) ? path : fallback;
  } catch {
    return fallback;
  }
}
