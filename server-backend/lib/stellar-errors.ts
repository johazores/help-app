import { ApiError } from "@/lib/api";

/** Result codes Horizon returns when it rejects a transaction. */
export interface SubmitResultCodes {
  transaction?: string;
  operations?: string[];
}

/** Pulls Horizon's result codes out of an SDK submit error, if present. */
export function resultCodesOf(err: unknown): SubmitResultCodes | null {
  const codes = (err as { response?: { data?: { extras?: { result_codes?: unknown } } } })?.response
    ?.data?.extras?.result_codes;
  return codes && typeof codes === "object" ? (codes as SubmitResultCodes) : null;
}

function httpStatusOf(err: unknown): number | null {
  const status = (err as { response?: { status?: unknown } })?.response?.status;
  return typeof status === "number" ? status : null;
}

/**
 * Turns a rejected submission into the message a person can act on. The
 * chain is the source of truth, so each message says what actually happened
 * instead of a generic "try again" that may be wrong (for example, retrying
 * cannot fix an empty wallet).
 */
export function submitFailureToApiError(err: unknown): ApiError {
  const codes = resultCodesOf(err);
  const all = [codes?.transaction, ...(codes?.operations ?? [])].filter(Boolean) as string[];
  const has = (code: string) => all.includes(code);

  if (has("op_underfunded") || has("tx_insufficient_balance")) {
    return new ApiError(400, "There isn't enough money in this wallet for that. Please add funds first.");
  }
  if (has("op_low_reserve")) {
    return new ApiError(
      400,
      "This wallet needs a small extra balance to hold another safety net. Please add funds first.",
    );
  }
  if (has("op_does_not_exist")) {
    return new ApiError(409, "This was already updated a moment ago. Please refresh to see the latest.");
  }
  if (has("op_cannot_claim")) {
    return new ApiError(409, "This isn't available to receive yet. Please check the date and try again later.");
  }
  if (has("op_no_trust") || has("op_src_no_trust") || has("op_not_authorized")) {
    return new ApiError(409, "This account isn't ready to receive this money yet. Please try again shortly.");
  }
  if (has("op_no_destination") || has("tx_no_source_account")) {
    return new ApiError(409, "One of these accounts isn't active yet. Please try again shortly.");
  }
  if (has("tx_bad_seq")) {
    return new ApiError(409, "Another update was finishing at the same time. Please try again.");
  }
  if (has("tx_too_late") || httpStatusOf(err) === 504) {
    // A timed-out submission may still be confirmed. Retrying blindly could
    // act twice, so the person is asked to refresh first.
    return new ApiError(
      504,
      "We're still waiting for confirmation. Please refresh in a minute before trying again.",
    );
  }
  return new ApiError(502, "The money couldn't be moved right now. Please try again.");
}
