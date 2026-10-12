import { environmentProblems, isFatal } from "@/lib/env";
import { log } from "@/lib/log";

/** Runs once when the API server starts. */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const problems = environmentProblems();
  for (const problem of problems) {
    log(isFatal(problem) ? "error" : "warn", "startup.environment", { problem });
  }
  const fatal = problems.filter(isFatal);
  if (fatal.length > 0 && process.env.NODE_ENV === "production") {
    throw new Error(`Sagip API cannot start: ${fatal.join(" ")}`);
  }
}
