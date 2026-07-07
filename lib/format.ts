import type { SafetyNetStatus } from "@/services/types";

/** Amounts are shown as plain numbers — no technical unit in the UI. */
export function formatMoney(amount: string | number): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** A warm, plain-language countdown: "3 days", "5 hours", "2 minutes". */
export function countdown(iso: string): { text: string; expired: boolean } {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { text: "now", expired: true };

  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days >= 1) return { text: days === 1 ? "1 day" : `${days} days`, expired: false };
  if (hours >= 1) return { text: hours === 1 ? "1 hour" : `${hours} hours`, expired: false };
  return { text: minutes <= 1 ? "1 minute" : `${minutes} minutes`, expired: false };
}

/** Fraction (0–1) of the current check-in window that has elapsed. */
export function windowProgress(lastCheckInIso: string, unlockIso: string): number {
  const start = new Date(lastCheckInIso).getTime();
  const end = new Date(unlockIso).getTime();
  const now = Date.now();
  if (end <= start) return 1;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

export function statusLabel(status: SafetyNetStatus, isOpen: boolean): string {
  if (status === "RECEIVED") return "Received";
  if (status === "CLOSED") return "Taken back";
  if (isOpen) return "Open to family";
  return "Watching over";
}

// ---- Currency / rates -------------------------------------------------------

export interface CurrencyMeta {
  code: string;
  label: string;
  symbol: string;
  locale: string;
}

// Ordered for our audience: home currency first, then major OFW destinations.
export const CURRENCIES: CurrencyMeta[] = [
  { code: "PHP", label: "Philippine peso", symbol: "\u20B1", locale: "en-PH" },
  { code: "USD", label: "US dollar", symbol: "$", locale: "en-US" },
  { code: "USDC", label: "USD Coin", symbol: "$", locale: "en-US" },
  { code: "EUR", label: "Euro", symbol: "\u20AC", locale: "en-IE" },
  { code: "SAR", label: "Saudi riyal", symbol: "SAR ", locale: "en" },
  { code: "AED", label: "UAE dirham", symbol: "AED ", locale: "en" },
  { code: "SGD", label: "Singapore dollar", symbol: "S$", locale: "en-SG" },
  { code: "HKD", label: "Hong Kong dollar", symbol: "HK$", locale: "en-HK" },
];

export function currencyMeta(code: string): CurrencyMeta {
  return CURRENCIES.find((c) => c.code === code) ?? { code, label: code, symbol: "", locale: "en" };
}

/** Convert an XLM amount to a fiat currency using a rate (fiat per 1 XLM). */
export function convertFromXlm(xlm: string | number, rate: number): number {
  const n = typeof xlm === "string" ? Number(xlm) : xlm;
  if (!Number.isFinite(n) || !Number.isFinite(rate)) return 0;
  return n * rate;
}

export function formatFiat(amount: number, code: string): string {
  const meta = currencyMeta(code);
  const value = amount.toLocaleString(meta.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${meta.symbol}${value}`;
}
