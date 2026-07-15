"use client";

import { Badge } from "@/components/ui/badge";
import { formatDateTime, referenceId, TX_STATUS } from "@/lib/format";
import type { Activity } from "@/services/types";

const dot: Record<Activity["type"], string> = {
  CREATED: "bg-ink",
  CHECKED_IN: "bg-sage",
  OPENED_TO_FAMILY: "bg-marigold",
  RECEIVED: "bg-marigold",
  RECEIVER_CHECKED_IN: "bg-sage",
  BACKUP_RECEIVED: "bg-marigold",
  CLOSED: "bg-line",
};

/**
 * The transaction history. Each entry reads like a receipt: what happened, its
 * status, a reference number, when, and a link to the permanent record.
 */
export function ActivityTimeline({
  items,
  explorerTxUrl,
}: {
  items: Activity[];
  explorerTxUrl?: string;
}) {
  if (items.length === 0) {
    return <p className="hint">Nothing has happened yet.</p>;
  }
  return (
    <ol className="relative ml-1 space-y-5 border-l border-line pl-6">
      {items.map((a) => {
        const status = TX_STATUS[a.type] ?? { label: "Completed", tone: "received" as const };
        const ref = referenceId(a.txHash, a.id);
        return (
          <li key={a.id} className="relative">
            <span
              className={`absolute -left-[30px] top-1.5 h-3 w-3 rounded-full ring-4 ring-paper ${dot[a.type]}`}
            />
            <div className="rounded-xl border border-line bg-paper/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[16px] font-semibold text-ink">{a.description}</p>
                <Badge tone={status.tone}>{status.label}</Badge>
              </div>
              <dl className="mt-2 grid grid-cols-1 gap-1 text-[14px] sm:grid-cols-2">
                <div className="flex justify-between gap-2 sm:block">
                  <dt className="text-subtle">Reference</dt>
                  <dd className="font-mono text-ink">{ref}</dd>
                </div>
                <div className="flex justify-between gap-2 sm:block sm:text-right">
                  <dt className="text-subtle sm:hidden">When</dt>
                  <dd className="text-subtle">{formatDateTime(a.createdAt)}</dd>
                </div>
              </dl>
              {a.txHash && explorerTxUrl ? (
                <a
                  href={`${explorerTxUrl}${a.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-sage hover:text-ink"
                >
                  View verified record ↗
                </a>
              ) : null}
              {a.txHash ? (
                <p className="mt-1 text-[12px] text-subtle">Saved permanently — not just in the app.</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
