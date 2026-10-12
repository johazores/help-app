import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";
import { ApiError, pruneRateLimits, rateLimit } from "@/lib/api";
import { prisma } from "@/lib/prisma";

after(() => prisma.$disconnect());

describe("database-backed rate limiting", () => {
  it("allows exactly `max` attempts per window, then answers 429 with Retry-After", async () => {
    const identity = randomUUID();
    for (let i = 0; i < 3; i++) await rateLimit("test-scope", identity, 3, 60_000);
    await assert.rejects(rateLimit("test-scope", identity, 3, 60_000), (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 429);
      assert.ok((err.retryAfterSeconds ?? 0) > 0 && (err.retryAfterSeconds ?? 0) <= 60);
      return true;
    });
  });

  it("counts concurrent attempts atomically", async () => {
    const identity = randomUUID();
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => rateLimit("test-concurrent", identity, 5, 60_000)),
    );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 5);
  });

  it("starts a fresh window once the previous one ends", async () => {
    const identity = randomUUID();
    await rateLimit("test-window", identity, 1, 50);
    await assert.rejects(rateLimit("test-window", identity, 1, 50));
    await new Promise((resolve) => setTimeout(resolve, 80));
    await rateLimit("test-window", identity, 1, 50);
  });

  it("keeps scopes independent and never stores the raw identity", async () => {
    const identity = `09${Date.now()}`.slice(0, 11);
    await rateLimit("test-a", identity, 1, 60_000);
    await rateLimit("test-b", identity, 1, 60_000);
    const rows = await prisma.rateLimitBucket.findMany({ where: { key: { startsWith: "test-a:" } } });
    assert.ok(rows.length > 0);
    assert.ok(rows.every((row) => !row.key.includes(identity)));
  });

  it("prunes only long-expired counters", async () => {
    const stale = `test-prune:${randomUUID()}`;
    await prisma.rateLimitBucket.create({
      data: { key: stale, hits: 1, resetAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    });
    assert.ok((await pruneRateLimits()) >= 1);
    assert.equal(await prisma.rateLimitBucket.findUnique({ where: { key: stale } }), null);
  });
});
