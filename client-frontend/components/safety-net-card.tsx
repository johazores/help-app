"use client";

import { memo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { countdown, formatMoney, statusLabel, windowProgress } from "@/lib/format";
import type { SafetyNet } from "@/services/types";

export const SafetyNetCard = memo(function SafetyNetCard({ net }: { net: SafetyNet }) {
  const progress = windowProgress(net.lastCheckInAt, net.unlockAt);
  const { text } = countdown(net.unlockAt);
  const open = net.status === "ACTIVE" && Date.parse(net.unlockAt) <= Date.now();

  const tone =
    net.status === "RECEIVED" || net.status === "BACKUP_RECEIVED"
      ? "received"
      : net.status === "GUARDED"
      ? "active"
      : net.status === "CLOSED"
      ? "closed"
      : open
      ? "open"
      : "active";

  return (
    <Link
      href={`/home/${net.id}`}
      className="card block p-6 transition-shadow hover:shadow-lift focus-visible:shadow-lift"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[15px] text-subtle">For {net.forName}</p>
          <h3 className="mt-0.5 text-[20px] font-bold text-ink">{net.label}</h3>
        </div>
        <Badge tone={tone}>{statusLabel(net.status, open)}</Badge>
      </div>

      <p className="mt-5 break-words font-display text-[clamp(26px,7vw,34px)] font-bold leading-none text-ink">
        {formatMoney(net.amount)}
      </p>

      {net.status === "ACTIVE" ? (
        <div className="mt-5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-line">
            <div
              className={`h-full rounded-full ${open ? "bg-marigold" : "bg-ink"}`}
              style={{ width: `${Math.max(4, progress * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-[14px] text-subtle">
            {net.kind === "GIFT"
              ? open
                ? "Ready for them now"
                : `Gift — opens in ${text}`
              : open
              ? "Open for your family now"
              : `Opens to family in ${text} if you don't check in`}
          </p>
        </div>
      ) : (
        <p className="mt-5 text-[14px] text-subtle">
          {net.status === "RECEIVED"
            ? `${net.forName} has received this.`
            : net.status === "GUARDED"
            ? `${net.forName} has this — ${net.backupName ?? "backup"} is next if they can't check in.`
            : net.status === "BACKUP_RECEIVED"
            ? `${net.backupName ?? "Backup"} received this after ${net.forName} couldn't check in.`
            : "You took this back."}
        </p>
      )}
    </Link>
  );
});
