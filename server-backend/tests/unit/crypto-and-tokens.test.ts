import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { before, describe, it } from "node:test";
import { decryptSecret, encryptSecret, hashPin, verifyPin } from "@/lib/crypto";
import { issueToken, verifyToken } from "@/lib/jwt";

before(() => {
  process.env.APP_ENCRYPTION_KEY ??= randomBytes(32).toString("base64");
  process.env.AUTH_TOKEN_SECRET ??= randomBytes(48).toString("base64url");
});

describe("secret encryption", () => {
  it("round-trips and uses a fresh IV every time", () => {
    const secret = "SBQWY3DNPFWGSZTFNZ2GK43UNFXW4ZLTMFZWK4TBMNSWGYLSOIFQ";
    const a = encryptSecret(secret);
    const b = encryptSecret(secret);
    assert.notEqual(a.iv, b.iv);
    assert.notEqual(a.cipherText, b.cipherText);
    assert.equal(decryptSecret(a), secret);
  });

  it("refuses tampered ciphertext", () => {
    const enc = encryptSecret("secret");
    const bytes = Buffer.from(enc.cipherText, "base64");
    bytes[0] ^= 0xff;
    assert.throws(() => decryptSecret({ ...enc, cipherText: bytes.toString("base64") }));
  });
});

describe("PIN hashing", () => {
  it("verifies the right PIN only", () => {
    const stored = hashPin("123456");
    assert.ok(verifyPin("123456", stored));
    assert.ok(!verifyPin("123457", stored));
    assert.ok(!verifyPin("123456", "not-a-hash"));
  });

  it("salts every hash", () => {
    assert.notEqual(hashPin("123456"), hashPin("123456"));
  });
});

describe("session tokens", () => {
  it("round-trips subject, session and scope", () => {
    const payload = verifyToken(issueToken("user-1", "session-1", "user"));
    assert.equal(payload?.sub, "user-1");
    assert.equal(payload?.sid, "session-1");
    assert.equal(payload?.scope, "user");
  });

  it("rejects a modified payload", () => {
    const [header, , signature] = issueToken("user-1", "session-1", "user").split(".");
    const forged = Buffer.from(
      JSON.stringify({ sub: "admin-1", sid: "s", scope: "admin", iat: 0, exp: 9_999_999_999 }),
    ).toString("base64url");
    assert.equal(verifyToken(`${header}.${forged}.${signature}`), null);
  });

  it("rejects garbage", () => {
    assert.equal(verifyToken(""), null);
    assert.equal(verifyToken("a.b"), null);
    assert.equal(verifyToken("a.b.c"), null);
  });
});
