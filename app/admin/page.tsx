"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { adminAuthService } from "@/services/admin-auth-service";
import { adminService } from "@/services/admin-service";
import { formatDateTime, formatMoney } from "@/lib/format";
import type { AdminOverview, SafetyNetStatus } from "@/services/types";

function shortKey(key: string | null): string {
  if (!key) return "—";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

function statusTone(status: SafetyNetStatus): "active" | "open" | "received" | "closed" {
  if (status === "RECEIVED") return "received";
  if (status === "CLOSED") return "closed";
  if (status === "OPENED") return "open";
  return "active";
}

function statusText(status: SafetyNetStatus): string {
  if (status === "RECEIVED") return "Received";
  if (status === "CLOSED") return "Taken back";
  if (status === "OPENED") return "Open";
  return "Watching";
}

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adminAuthService.isSignedIn()) {
      router.replace("/admin/sign-in");
      return;
    }
    adminService
      .overview()
      .then(setData)
      .catch(() => {
        // Expired or invalid admin session — back to the admin door.
        adminAuthService.signOut();
        router.replace("/admin/sign-in");
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center py-20 text-ink">
          <Spinner className="h-7 w-7" />
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <p className="text-[17px] text-body">{error ?? "No data."}</p>
      </AppShell>
    );
  }

  const { stats, transactions, safetyNets, users, explorer } = data;

  const statCards = [
    { label: "People", value: stats.users.toString() },
    { label: "Safety nets", value: stats.safetyNets.toString() },
    { label: "Watching now", value: stats.active.toString() },
    { label: "Set aside", value: formatMoney(stats.totalSetAside) },
  ];

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">Admin</h1>
        <div className="flex items-center gap-3">
          <Badge tone="neutral">{explorer.network}</Badge>
          <button
            onClick={() => adminAuthService.signOut().then(() => router.replace("/admin/sign-in"))}
            className="text-[14px] font-semibold text-subtle hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </div>
      <p className="mt-2 text-[16px] text-body">Everything happening across Sagip, in one place.</p>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-[14px] text-subtle">{s.label}</p>
            <p className="mt-1 font-display text-[30px] font-bold text-ink">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <section className="mt-10">
        <h2 className="text-[20px] font-bold text-ink">Transactions</h2>
        <p className="hint mt-1">Every recorded action on the network. Tap a record to view it.</p>
        <div className="mt-4 card divide-y divide-line p-0">
          {transactions.length === 0 ? (
            <p className="p-6 hint">No transactions yet.</p>
          ) : (
            transactions.map((t) => (
              <div key={t.id} className="flex flex-col gap-1 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-medium text-ink">{t.description}</p>
                  <p className="text-[14px] text-subtle">
                    {t.ownerName} · {t.netLabel} · {formatDateTime(t.createdAt)}
                  </p>
                </div>
                {t.txHash ? (
                  <a
                    href={`${explorer.explorerTxUrl}${t.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 font-mono text-[13px] font-semibold text-sage hover:text-ink"
                  >
                    {t.txHash.slice(0, 6)}…{t.txHash.slice(-6)} ↗
                  </a>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Safety nets */}
      <section className="mt-10">
        <h2 className="text-[20px] font-bold text-ink">Safety nets</h2>
        <div className="mt-4 card divide-y divide-line p-0">
          {safetyNets.map((n) => (
            <div key={n.id} className="flex items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold text-ink">{n.label}</p>
                <p className="text-[14px] text-subtle">
                  {n.ownerName} → {n.recipientName}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="font-display text-[18px] font-bold text-ink">{formatMoney(n.amount)}</span>
                <Badge tone={statusTone(n.status)}>{statusText(n.status)}</Badge>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Users */}
      <section className="mt-10">
        <h2 className="text-[20px] font-bold text-ink">People</h2>
        <div className="mt-4 card divide-y divide-line p-0">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold text-ink">{u.name}</p>
                <p className="text-[14px] text-subtle">
                  {u.phone} · {u.safetyNets} safety nets · {u.recipients} loved ones
                </p>
              </div>
              {u.publicKey ? (
                <a
                  href={`${explorer.explorerAccountUrl}${u.publicKey}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 font-mono text-[13px] font-semibold text-sage hover:text-ink"
                >
                  {shortKey(u.publicKey)} ↗
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
