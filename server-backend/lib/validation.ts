import { ApiError } from "@/lib/api";

/** Largest amount a Stellar operation accepts (int64 stroops). */
export const STELLAR_MAX_AMOUNT = "922337203685.4775807";
const STELLAR_DECIMALS = 7;
const AMOUNT_PATTERN = /^\d{1,12}(\.\d{1,7})?$/;
const PH_MOBILE_PATTERN = /^(?:\+?63|0)?(9\d{9})$/;

/** Reads a request field as a trimmed string; non-strings become "". */
export function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

/** Philippine mobile number in the canonical 09XXXXXXXXX form. */
export function normalizePhone(
  input: unknown,
  message = "Please enter a valid mobile number.",
): string {
  const compact = text(input).replace(/[\s()-]/g, "");
  const match = PH_MOBILE_PATTERN.exec(compact);
  if (!match) throw new ApiError(400, message);
  return `0${match[1]}`;
}

export function normalizeEmail(input: unknown): string {
  const email = text(input).toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new ApiError(400, "Please enter a valid email address.");
  }
  return email;
}

export function requirePin(input: unknown, message = "Your PIN must be 6 numbers."): string {
  const pin = text(input);
  if (!/^\d{6}$/.test(pin)) throw new ApiError(400, message);
  return pin;
}

/**
 * Parses a money amount exactly as Stellar will see it: positive, at most
 * seven decimal places, and within the protocol maximum. Returns the amount
 * with seven decimals so stored values match on-chain values byte for byte.
 */
export function parseAmount(
  input: unknown,
  options: { max?: number; message?: string } = {},
): string {
  const message = options.message ?? "Please enter a valid amount.";
  const raw = text(input).replace(/,/g, "");
  if (!AMOUNT_PATTERN.test(raw)) throw new ApiError(400, message);

  const [whole, fraction = ""] = raw.split(".");
  const normalized = `${BigInt(whole)}.${fraction.padEnd(STELLAR_DECIMALS, "0")}`;
  if (/^0\.0+$/.test(normalized)) throw new ApiError(400, message);
  if (compareAmounts(normalized, STELLAR_MAX_AMOUNT) > 0) {
    throw new ApiError(400, "That amount is too large.");
  }
  if (options.max !== undefined && Number(normalized) > options.max) {
    throw new ApiError(400, `Please enter an amount up to ${options.max.toLocaleString("en-US")}.`);
  }
  return normalized;
}

/** Compares two non-negative seven-decimal amount strings without float error. */
export function compareAmounts(a: string, b: string): number {
  const stroops = (value: string) => {
    const [whole, fraction = ""] = value.split(".");
    return BigInt(whole) * 10n ** 7n + BigInt(fraction.padEnd(STELLAR_DECIMALS, "0").slice(0, 7) || "0");
  };
  const diff = stroops(a) - stroops(b);
  return diff === 0n ? 0 : diff > 0n ? 1 : -1;
}

/** "25.5000000" → "25.5" for human-facing sentences. */
export function displayAmount(amount: string): string {
  if (!amount.includes(".")) return amount;
  return amount.replace(/0+$/, "").replace(/\.$/, "");
}
