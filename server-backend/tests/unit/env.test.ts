import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { describe, it } from "node:test";
import { environmentProblems, isFatal } from "@/lib/env";

const valid = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://localhost/sagip",
  AUTH_TOKEN_SECRET: randomBytes(48).toString("base64url"),
  APP_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
  CRON_SECRET: "cron",
} as NodeJS.ProcessEnv;

describe("environmentProblems", () => {
  it("accepts a complete production environment", () => {
    assert.deepEqual(environmentProblems(valid), []);
  });

  it("rejects short, example, and malformed secrets", () => {
    const problems = environmentProblems({
      ...valid,
      AUTH_TOKEN_SECRET: "change-me-to-a-long-random-string-xxxxxxxx",
      APP_ENCRYPTION_KEY: "change-me-32-byte-base64-key",
    });
    assert.equal(problems.length, 2);
    assert.ok(problems.every(isFatal));
    assert.match(environmentProblems({ ...valid, AUTH_TOKEN_SECRET: "short" })[0], /32 characters/);
  });

  it("treats a missing cron secret as a warning only", () => {
    const problems = environmentProblems({ ...valid, CRON_SECRET: undefined });
    assert.equal(problems.length, 1);
    assert.equal(isFatal(problems[0]), false);
  });
});
