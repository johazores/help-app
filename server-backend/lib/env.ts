/**
 * Startup checks for the secrets every request depends on. A missing or weak
 * secret should stop a deployment at boot, not surface later as a 500 on the
 * first sign-in.
 */
export function environmentProblems(env: NodeJS.ProcessEnv = process.env): string[] {
  const problems: string[] = [];

  if (!env.DATABASE_URL) problems.push("DATABASE_URL is not set.");

  const tokenSecret = env.AUTH_TOKEN_SECRET ?? "";
  if (tokenSecret.length < 32) {
    problems.push("AUTH_TOKEN_SECRET must be at least 32 characters.");
  } else if (/change-me/i.test(tokenSecret)) {
    problems.push("AUTH_TOKEN_SECRET still has the example value from .env.example.");
  }

  const encryptionKey = env.APP_ENCRYPTION_KEY ?? "";
  if (Buffer.from(encryptionKey, "base64").length !== 32) {
    problems.push("APP_ENCRYPTION_KEY must be base64 that decodes to exactly 32 bytes.");
  }

  if (env.NODE_ENV === "production" && !env.CRON_SECRET) {
    problems.push("CRON_SECRET is not set, so scheduled reminders are disabled.");
  }

  if (env.NODE_ENV === "production" && !env.PROXY_SHARED_SECRET && env.VERCEL !== "1") {
    problems.push(
      "PROXY_SHARED_SECRET is not set, so per-visitor rate limits see only the web proxy's address.",
    );
  }

  return problems;
}

/** Problems that make the API unsafe or unable to run; the rest are warnings. */
export function isFatal(problem: string): boolean {
  return !problem.startsWith("CRON_SECRET") && !problem.startsWith("PROXY_SHARED_SECRET");
}
