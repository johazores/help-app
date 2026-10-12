import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError } from "@/lib/api";
import {
  compareAmounts,
  displayAmount,
  normalizeEmail,
  normalizePhone,
  parseAmount,
  requirePin,
  text,
} from "@/lib/validation";

function rejects400(fn: () => unknown) {
  assert.throws(fn, (err: unknown) => err instanceof ApiError && err.status === 400);
}

describe("normalizePhone", () => {
  it("maps every common Philippine format to one canonical number", () => {
    for (const input of [
      "09171234567",
      "+639171234567",
      "639171234567",
      "9171234567",
      "0917-123-4567",
      "+63 917 123 4567",
      "(0917) 123 4567",
    ]) {
      assert.equal(normalizePhone(input), "09171234567", input);
    }
  });

  it("rejects non-mobile and malformed input", () => {
    for (const input of ["", "0817123456", "091712345678", "abc", 917, null, { phone: "0917" }]) {
      rejects400(() => normalizePhone(input));
    }
  });

  it("uses the caller's message", () => {
    assert.throws(() => normalizePhone("", "Enter theirs."), { message: "Enter theirs." });
  });
});

describe("parseAmount", () => {
  it("returns seven decimals exactly as Stellar stores them", () => {
    assert.equal(parseAmount("25"), "25.0000000");
    assert.equal(parseAmount("0.5"), "0.5000000");
    assert.equal(parseAmount("1,250.75"), "1250.7500000");
    assert.equal(parseAmount(100), "100.0000000");
    assert.equal(parseAmount("0.0000001"), "0.0000001");
  });

  it("rejects zero, negatives, too many decimals, and non-numbers", () => {
    for (const input of ["0", "0.0000000", "-5", "1.12345678", "1e3", "abc", "", null, "1.2.3"]) {
      rejects400(() => parseAmount(input));
    }
  });

  it("rejects amounts above the protocol maximum without float rounding", () => {
    assert.equal(parseAmount("922337203685.4775807"), "922337203685.4775807");
    rejects400(() => parseAmount("922337203685.4775808"));
  });

  it("enforces a caller maximum", () => {
    assert.equal(parseAmount("1000", { max: 1000 }), "1000.0000000");
    rejects400(() => parseAmount("1000.01", { max: 1000 }));
  });
});

describe("amount helpers", () => {
  it("compares amounts in stroops", () => {
    assert.equal(compareAmounts("0.1000000", "0.1"), 0);
    assert.equal(compareAmounts("10.0000001", "10"), 1);
    assert.equal(compareAmounts("9.9999999", "10"), -1);
  });

  it("trims trailing zeros for sentences", () => {
    assert.equal(displayAmount("25.0000000"), "25");
    assert.equal(displayAmount("25.5000000"), "25.5");
    assert.equal(displayAmount("0.0000001"), "0.0000001");
  });
});

describe("text, email, and PIN helpers", () => {
  it("coerces request fields safely", () => {
    assert.equal(text("  hi  "), "hi");
    assert.equal(text(42), "42");
    assert.equal(text({}), "");
    assert.equal(text(undefined), "");
  });

  it("normalizes email and rejects invalid addresses", () => {
    assert.equal(normalizeEmail("  Ana@Example.COM "), "ana@example.com");
    rejects400(() => normalizeEmail("ana@"));
    rejects400(() => normalizeEmail(`${"a".repeat(250)}@example.com`));
  });

  it("accepts only six-digit PINs", () => {
    assert.equal(requirePin("012345"), "012345");
    rejects400(() => requirePin("12345"));
    rejects400(() => requirePin("12345a"));
    // A JSON number keeps working, but one that lost its leading zero does not.
    assert.equal(requirePin(123456), "123456");
    rejects400(() => requirePin(12345));
  });
});
