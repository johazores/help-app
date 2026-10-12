"use client";

import { useEffect, useState } from "react";
import { impactService } from "@/services/impact-service";
import { formatDateTime, referenceId } from "@/lib/format";
import type { ActivityType, ImpactStats } from "@/services/types";

const ACTION_LABEL: Record<ActivityType, string> = {
  CREATED: "Money set aside",
  CHECKED_IN: "Sender checked in",
  OPENED_TO_FAMILY: "Opened early for family",
  RECEIVED: "Family received",
  RECEIVER_CHECKED_IN: "Receiver checked in",
  BACKUP_RECEIVED: "Backup received",
  CLOSED: "Taken back",
};

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-paper px-4 py-3">
      <dd className="font-display text-[28px] font-bold leading-none text-ink">{value.toLocaleString("en-PH")}</dd>
      <dt className="mt-1 text-[13px] text-subtle">{label}</dt>
    </div>
  );
}

/**
 * Live, aggregate activity with links to the public receipts, so anyone can
 * check that the numbers correspond to real confirmed transactions.
 */
export function ImpactPanel() {
  const [stats, setStats] = useState<ImpactStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    impactService
      .stats()
      .then((value) => alive && setStats(value))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  if (failed) return null;

  return (
    <section className="card mt-5 p-6" aria-labelledby="impact-heading" aria-busy={!stats}>
      <h2 id="impact-heading" className="text-[20px] font-bold text-ink">
        Activity on the {stats?.network === "public" ? "live" : "test"} network
      </h2>
      <p className="mt-1 text-[15px] text-body">
        Totals across every family using this deployment. No names or amounts are shown; each
        receipt below opens the public record.
      </p>
      {stats ? (
        <>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Figure value={stats.totals.families} label="Families" />
            <Figure value={stats.totals.safetyNets} label="Safety nets" />
            <Figure value={stats.totals.checkIns} label="Check-ins" />
            <Figure value={stats.totals.deliveredToFamily} label="Delivered to family" />
            <Figure value={stats.totals.protectedNow} label="Protected right now" />
            <Figure value={stats.totals.backupHandovers} label="Passed to a backup" />
            <Figure value={stats.totals.confirmedTransactions} label="Confirmed transactions" />
            <Figure value={stats.last30Days.confirmedTransactions} label="Transactions, last 30 days" />
          </dl>
          {stats.latestReceipts.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-[15px] font-bold text-ink">Latest receipts</h3>
              <ul className="mt-2 divide-y divide-line">
                {stats.latestReceipts.map((receipt) => (
                  <li key={receipt.txHash} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[14px]">
                    <span className="text-body">
                      {ACTION_LABEL[receipt.action] ?? "Recorded"} · {formatDateTime(receipt.confirmedAt)}
                    </span>
                    <a
                      href={`${stats.explorerTxUrl}${receipt.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center font-mono font-semibold text-ink underline"
                    >
                      {referenceId(receipt.txHash, receipt.txHash)} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-[70px] animate-pulse rounded-xl bg-line/50" />
          ))}
        </div>
      )}
    </section>
  );
}
