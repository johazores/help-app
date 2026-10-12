import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resultCodesOf, submitFailureToApiError } from "@/lib/stellar-errors";

function horizonError(codes: { transaction?: string; operations?: string[] }, status = 400) {
  return { response: { status, data: { extras: { result_codes: codes } } } };
}

describe("submitFailureToApiError", () => {
  const cases: Array<[string, { transaction?: string; operations?: string[] }, number, RegExp]> = [
    ["empty wallet", { transaction: "tx_failed", operations: ["op_underfunded"] }, 400, /isn't enough money/],
    ["fees exceed balance", { transaction: "tx_insufficient_balance" }, 400, /isn't enough money/],
    ["reserve", { transaction: "tx_failed", operations: ["op_low_reserve"] }, 400, /small extra balance/],
    ["already claimed", { transaction: "tx_failed", operations: ["op_does_not_exist", "op_success"] }, 409, /already updated/],
    ["not yet claimable", { transaction: "tx_failed", operations: ["op_cannot_claim"] }, 409, /isn't available to receive yet/],
    ["missing trustline", { transaction: "tx_failed", operations: ["op_no_trust"] }, 409, /isn't ready to receive/],
    ["stale sequence", { transaction: "tx_bad_seq" }, 409, /same time/],
    ["expired", { transaction: "tx_too_late" }, 504, /refresh in a minute/],
  ];

  for (const [name, codes, status, message] of cases) {
    it(`maps ${name}`, () => {
      const err = submitFailureToApiError(horizonError(codes));
      assert.equal(err.status, status);
      assert.match(err.message, message);
    });
  }

  it("treats a gateway timeout as possibly confirmed", () => {
    const err = submitFailureToApiError({ response: { status: 504, data: {} } });
    assert.equal(err.status, 504);
  });

  it("falls back to a retryable 502 for unknown failures", () => {
    assert.equal(submitFailureToApiError(new Error("socket hang up")).status, 502);
  });

  it("extracts result codes only when Horizon sent them", () => {
    assert.deepEqual(resultCodesOf(horizonError({ transaction: "tx_bad_seq" })), {
      transaction: "tx_bad_seq",
    });
    assert.equal(resultCodesOf(new Error("x")), null);
  });
});
