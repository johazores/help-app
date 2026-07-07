"use client";

import { formatDateTime } from "@/lib/format";
import type { Activity } from "@/services/types";

const dot: Record<Activity["type"], string> = {
  CREATED: "bg-ink",
  CHECKED_IN: "bg-sage",
  OPENED_TO_FAMILY: "bg-marigold",
  RECEIVED: "bg-marigold",
  CLOSED: "bg-line",
};

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
    <ol className="relative ml-1 space-y-6 border-l border-line pl-6">
      {items.map((a) => (
        <li key={a.id} className="relative">
          <span
            className={`absolute -left-[30px] top-1.5 h-3 w-3 rounded-full ring-4 ring-paper ${dot[a.type]}`}
          />
          <p className="text-[16px] font-medium text-ink">{a.description}</p>
          <p className="mt-0.5 text-[14px] text-subtle">{formatDateTime(a.createdAt)}</p>
          {a.txHash && explorerTxUrl ? (
            <a
              href={`${explorerTxUrl}${a.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-sage hover:text-ink"
            >
              View record ↗
            </a>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
