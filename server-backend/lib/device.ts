/** A short, human-readable device name from the User-Agent, for the sessions list. */
export function deviceName(userAgent: string | undefined): string {
  const ua = userAgent ?? "";
  const os = /iPhone|iPad/i.test(ua)
    ? "iPhone/iPad"
    : /Android/i.test(ua)
    ? "Android"
    : /Windows/i.test(ua)
    ? "Windows"
    : /Mac OS/i.test(ua)
    ? "Mac"
    : /Linux/i.test(ua)
    ? "Linux"
    : "Unknown device";
  const browser = /Edg\//i.test(ua)
    ? "Edge"
    : /OPR\//i.test(ua)
    ? "Opera"
    : /Chrome\//i.test(ua)
    ? "Chrome"
    : /Safari\//i.test(ua) && !/Chrome/i.test(ua)
    ? "Safari"
    : /Firefox\//i.test(ua)
    ? "Firefox"
    : "Browser";
  return `${browser} on ${os}`;
}
