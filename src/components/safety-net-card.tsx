"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { countdown, formatMoney, statusLabel, windowProgress } from "@/lib/format";
import type { SafetyNet } from "@/services/types";

export function SafetyNetCard({ net }: { net: SafetyNet }) {
  const progress = windowProgress(net.lastCheckInAt, net.unlockAt);
  const { text } = countdown(net.unlockAt);

  const tone =
    net.status === "RECEIVED"
      ? "received"
      : net.status === "CLOSED"
      ? "closed"
      : net.isOpen
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
        <Badge tone={tone}>{statusLabel(net.status, net.isOpen)}</Badge>
      </div>

      <p className="mt-5 font-display text-[34px] font-bold leading-none text-ink">
        {formatMoney(net.amount)}
      </p>

      {net.status === "ACTIVE" ? (
        <div className="mt-5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-line">
            <div
              className={`h-full rounded-full ${net.isOpen ? "bg-marigold" : "bg-ink"}`}
              style={{ width: `${Math.max(4, progress * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-[14px] text-subtle">
            {net.isOpen ? "Open for your family now" : `Opens to family in ${text} if you don't check in`}
          </p>
        </div>
      ) : (
        <p className="mt-5 text-[14px] text-subtle">
          {net.status === "RECEIVED" ? `${net.forName} has received this.` : "You took this back."}
        </p>
      )}
    </Link>
  );
}
