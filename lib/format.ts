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
