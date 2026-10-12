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
  if (status === "GUARDED") return "Received — backup set";
  if (status === "BACKUP_RECEIVED") return "Received by backup";
  if (status === "CLOSED") return "Taken back";
  if (status === "OPENED" || isOpen) return "Open to family";
  return "Protected";
}

export type StatusTone = "active" | "open" | "received" | "closed" | "neutral";

export function statusTone(status: SafetyNetStatus, isOpen: boolean): StatusTone {
  if (status === "RECEIVED" || status === "GUARDED" || status === "BACKUP_RECEIVED") return "received";
  if (status === "CLOSED") return "closed";
  if (status === "OPENED" || isOpen) return "open";
  return "active";
}

// ---- Check-in schedule ------------------------------------------------------

export interface CheckInInterval {
  minutes: number;
  label: string;
  phrase: string;
  note?: string;
}

/** Choices the API accepts; "every minute" exists to try the full flow quickly. */
export const CHECK_IN_INTERVALS: CheckInInterval[] = [
  { minutes: 1, label: "Every minute", phrase: "every minute", note: "For trying it out" },
  { minutes: 10080, label: "Every week", phrase: "every week" },
  { minutes: 43200, label: "Every month", phrase: "every month" },
  { minutes: 129600, label: "Every 3 months", phrase: "every 3 months" },
];

export function intervalPhrase(minutes: number): string {
  return CHECK_IN_INTERVALS.find((i) => i.minutes === minutes)?.phrase ?? "on schedule";
}

// ---- Inputs -----------------------------------------------------------------

/** Keeps digits and a single decimal point, with at most seven decimals. */
export function decimalInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole = "", ...decimals] = cleaned.split(".");
  return decimals.length > 0 ? `${whole}.${decimals.join("").slice(0, 7)}` : whole;
}

/** Splits a long key into groups of four so it can be read aloud or copied by hand. */
export function chunked(value: string, size = 4): string {
  return value.match(new RegExp(`.{1,${size}}`, "g"))?.join(" ") ?? value;
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
  { code: "USDC", label: "Digital dollar", symbol: "$", locale: "en-US" },
  { code: "EUR", label: "Euro", symbol: "\u20AC", locale: "en-IE" },
  { code: "SAR", label: "Saudi riyal", symbol: "SAR ", locale: "en" },
  { code: "AED", label: "UAE dirham", symbol: "AED ", locale: "en" },
  { code: "SGD", label: "Singapore dollar", symbol: "S$", locale: "en-SG" },
  { code: "HKD", label: "Hong Kong dollar", symbol: "HK$", locale: "en-HK" },
];

export function currencyMeta(code: string): CurrencyMeta {
  return CURRENCIES.find((c) => c.code === code) ?? { code, label: code, symbol: "", locale: "en" };
}

/** Convert a held balance to fiat using live rates (works for XLM or USDC base). */
export function convertFromHeld(amount: string | number, rate: number): number {
  const n = typeof amount === "string" ? Number(amount) : amount;
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

// ---- Transactions -----------------------------------------------------------

/** A stable, human-friendly reference id derived from the transaction. */
export function referenceId(seed: string | null | undefined, fallback: string): string {
  const base = (seed && seed.length >= 8 ? seed : fallback).replace(/[^a-zA-Z0-9]/g, "");
  const chunk = base.slice(0, 10).toUpperCase().padEnd(10, "0");
  return `SGP-${chunk.slice(0, 5)}-${chunk.slice(5, 10)}`;
}

export interface TxStatusMeta {
  label: string;
  tone: StatusTone;
}

// How each recorded action maps to a plain-language status.
export const TX_STATUS: Record<string, TxStatusMeta> = {
  CREATED: { label: "Completed", tone: "received" },
  CHECKED_IN: { label: "Completed", tone: "received" },
  OPENED_TO_FAMILY: { label: "Open", tone: "open" },
  RECEIVED: { label: "Completed", tone: "received" },
  RECEIVER_CHECKED_IN: { label: "Completed", tone: "received" },
  BACKUP_RECEIVED: { label: "Completed", tone: "received" },
  CLOSED: { label: "Completed", tone: "received" },
};
