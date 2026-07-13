"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SafetyNetLifeline } from "@/components/safety-net-lifeline";
import { ActivityTimeline } from "@/components/activity-timeline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { authService } from "@/services/auth-service";
import { safetyNetService } from "@/services/safety-net-service";
import { configService } from "@/services/config-service";
import { formatMoney, formatDate, statusLabel } from "@/lib/format";
import type { AppConfig, SafetyNetDetail } from "@/services/types";

export default function SafetyNetDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [net, setNet] = useState<SafetyNetDetail | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"checkin" | "close" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [justCreated, setJustCreated] = useState(false);

  const load = useCallback(async () => {
    try {
      setNet(await safetyNetService.detail(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authService.isSignedIn()) {
      router.replace("/sign-in");
      return;
    }
    load();
    configService.get().then(setConfig).catch(() => {});
    if (typeof window !== "undefined") {
      setJustCreated(new URLSearchParams(window.location.search).get("created") === "1");
    }
  }, [load, router]);

  async function checkIn() {
    setBusy("checkin");
    setError(null);
    try {
      await safetyNetService.checkIn(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't check in.");
    } finally {
      setBusy(null);
    }
  }

  async function takeBack() {
    if (!confirm("Take back this money? Your family will no longer receive it.")) return;
    setBusy("close");
    setError(null);
    try {
      await safetyNetService.close(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't take it back.");
    } finally {
      setBusy(null);
    }
  }

  function copyLink() {
    if (!net) return;
    const url = `${window.location.origin}/claim/${net.claimCode}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center py-20 text-ink">
          <Spinner className="h-7 w-7" />
        </div>
      </AppShell>
    );
  }

  if (!net) {
    return (
      <AppShell>
        <p className="text-[17px] text-body">{error ?? "This safety net doesn't exist."}</p>
        <Link href="/home" className="mt-4 inline-block font-semibold text-ink underline">
          Back home
        </Link>
      </AppShell>
    );
  }

  const active = net.status === "ACTIVE";
  const openNow = active && Date.parse(net.unlockAt) <= Date.now();
  const streak = net.activity.filter((a) => a.type === "CHECKED_IN").length;
  const tone =
    net.status === "RECEIVED" || net.status === "BACKUP_RECEIVED"
      ? "received"
      : net.status === "GUARDED"
      ? "active"
      : net.status === "CLOSED"
      ? "closed"
      : openNow
      ? "open"
      : "active";

  const showShareLink =
    net.status === "ACTIVE" ||
    net.status === "GUARDED" ||
    net.status === "RECEIVED" ||
    net.status === "BACKUP_RECEIVED";

  return (
    <AppShell>
      <Link href="/home" className="text-[15px] font-semibold text-subtle hover:text-ink">
        ← Back
      </Link>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[16px] text-subtle">For {net.forName} · {net.forRelationship}</p>
          <h1 className="break-words font-display text-[28px] font-bold leading-tight text-ink sm:text-[36px]">{net.label}</h1>
        </div>
        <Badge tone={tone}>{statusLabel(net.status, openNow)}</Badge>
      </div>

      {net.requestState === "REQUESTED" && active && !openNow ? (
        <div className="mt-5 rounded-2xl border-2 border-marigold bg-marigold/10 p-5">
          <p className="text-[17px] font-bold text-ink">{net.forName} is asking to receive this now</p>
          <p className="mt-1 text-[15px] text-body">
            If it&rsquo;s an emergency, you can open it for them right away. Otherwise, dismiss this and
            everything stays as it is.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button size="md" loading={busy === "checkin"} onClick={async () => {
              setBusy("checkin");
              try { await safetyNetService.approveEarly(net.id); await load(); } finally { setBusy(null); }
            }}>
              Open it for {net.forName} now
            </Button>
            <Button size="md" variant="ghost" onClick={async () => { await safetyNetService.dismissEarly(net.id); await load(); }}>
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}

      {justCreated ? (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-sage/40 bg-sage/10 p-5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage text-paper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12.5 10 17 19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="text-[17px] font-bold text-ink">Money set aside successfully</p>
            <p className="mt-0.5 text-[15px] text-body">
              {formatMoney(net.amount)} is safely set aside for {net.forName}. Your receipt is in the
              history below. Share the link so they can receive it when the time comes.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <SafetyNetLifeline
          amount={net.amount}
          status={net.status}
          kind={net.kind}
          unlockAt={net.unlockAt}
          lastCheckInAt={net.lastCheckInAt}
          forName={net.forName}
          busy={busy === "checkin"}
          streak={streak}
          onCheckIn={checkIn}
        />

        {/* Right: sharing + secondary actions + activity */}
        <div className="space-y-6">
          {showShareLink ? (
            <div className="card p-6">
              <h2 className="text-[18px] font-bold text-ink">
                {net.status === "ACTIVE" ? `Share with ${net.forName}` : "Their link"}
              </h2>
              <p className="mt-1 text-[15px] text-body">
                {net.status === "ACTIVE" ? (
                  <>
                    Send this link to {net.forName}. If the money ever opens to them, they&rsquo;ll be able to
                    receive it here — no account needed.
                  </>
                ) : net.status === "GUARDED" ? (
                  <>
                    {net.forName} uses this link to check in and keep the money. If they lose their phone,
                    send it again — or ask them to visit{" "}
                    <Link href="/claim/recover" className="font-semibold text-ink underline">
                      Find your link
                    </Link>{" "}
                    if you saved their mobile number.
                  </>
                ) : (
                  <>
                    This is {net.forName}&rsquo;s proof and access link. Send it again anytime if they
                    lose their phone.
                  </>
                )}
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <code className="min-w-0 flex-1 break-all rounded-xl border border-line bg-paper px-4 py-3 text-[13px] leading-relaxed text-ink sm:text-[14px]">
                  {typeof window !== "undefined" ? `${window.location.origin}/claim/${net.claimCode}` : `…/claim/${net.claimCode}`}
                </code>
                <Button size="md" variant="secondary" onClick={copyLink}>
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>
              <Link href={`/home/${net.id}/card`} className="mt-3 inline-block text-[14px] font-semibold text-ink underline">
                Print a card with this link
              </Link>
            </div>
          ) : null}

          {net.status === "RECEIVED" && !net.backupName ? (
            <div className="card border border-line bg-paper p-6">
              <h2 className="text-[18px] font-bold text-ink">After {net.forName} received</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-body">
                No backup was set for this safety net. If {net.forName} passes away, the money stays in
                their account — it does not automatically pass to someone else in Sagip. For future safety
                nets, add a backup person when you set money aside.
              </p>
            </div>
          ) : null}

          {net.status === "GUARDED" && net.backupName ? (
            <div className="card border border-sage/30 bg-sage/5 p-6">
              <h2 className="text-[18px] font-bold text-ink">Succession is active</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-body">
                {net.forName} received this money and must check in on their link. If they pass away or
                can&rsquo;t check in, {net.backupName} can receive it after{" "}
                {net.postReceiptUnlockAt ? formatDate(net.postReceiptUnlockAt) : "the check-in window"}.
              </p>
            </div>
          ) : null}

          <div className="card p-6">
            <h2 className="text-[18px] font-bold text-ink">History</h2>
            <div className="mt-5">
              <ActivityTimeline items={net.activity} explorerTxUrl={config?.explorerTxUrl} />
            </div>
          </div>

          {active ? (
            <div className="card p-6">
              <h2 className="text-[18px] font-bold text-ink">Take the money back</h2>
              <p className="mt-1 text-[15px] text-body">
                Changed your mind? You can return this money to yourself at any time.
              </p>
              <div className="mt-4">
                <Button variant="danger" size="md" loading={busy === "close"} onClick={takeBack}>
                  Take back {formatMoney(net.amount)}
                </Button>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="text-[15px] font-medium text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
