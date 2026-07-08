"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { LifelineRing } from "@/components/lifeline-ring";
import { ActivityTimeline } from "@/components/activity-timeline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { authService } from "@/services/auth-service";
import { safetyNetService } from "@/services/safety-net-service";
import { configService } from "@/services/config-service";
import { countdown, formatMoney, statusLabel, windowProgress } from "@/lib/format";
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
  const [, setTick] = useState(0);

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

  // Live-updating countdown.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

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

  const progress = windowProgress(net.lastCheckInAt, net.unlockAt);
  const { text: remaining } = countdown(net.unlockAt);
  const active = net.status === "ACTIVE";
  const openNow = active && Date.parse(net.unlockAt) <= Date.now();
  const isGift = net.kind === "GIFT";
  const streak = net.activity.filter((a) => a.type === "CHECKED_IN").length;
  const tone =
    net.status === "RECEIVED" ? "received" : net.status === "CLOSED" ? "closed" : openNow ? "open" : "active";

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
        {/* Left: the lifeline + primary action */}
        <div className="card flex flex-col items-center p-8 text-center">
          <p className="break-words font-display text-[clamp(34px,9vw,44px)] font-bold leading-none text-ink">
            {formatMoney(net.amount)}
          </p>
          <p className="mt-2 text-[15px] text-subtle">set aside</p>

          <div className="mt-7">
            {active ? (
              <LifelineRing
                progress={progress}
                open={openNow}
                centerLabel={openNow ? "Open" : remaining}
                centerSub={openNow ? (isGift ? "ready for them" : "for your family") : (isGift ? "until the gift opens" : "until it opens to family")}
              />
            ) : (
              <LifelineRing progress={1} open centerLabel={net.status === "RECEIVED" ? "Received" : "Closed"} />
            )}
          </div>

          {active && !openNow && !isGift ? (
            <div className="mt-8 w-full">
              <Button fullWidth loading={busy === "checkin"} onClick={checkIn}>
                I&rsquo;m okay — check in
              </Button>
              <p className="mt-3 text-[14px] text-subtle">
                This keeps the money yours and resets the timer.
              </p>
              {streak >= 2 ? (
                <p className="mt-2 text-[14px] font-semibold text-sage">
                  {streak} check-ins in a row — your family is well looked after.
                </p>
              ) : null}
            </div>
          ) : null}
          {active && !openNow && isGift ? (
            <p className="mt-8 text-[15px] text-body">
              This gift opens on its own — nothing for you to do.
            </p>
          ) : null}

          {active && openNow ? (
            <div className="mt-8 w-full rounded-xl bg-marigold/15 p-4 text-[15px] text-marigold-deep">
              The check-in window has passed. Your family can now receive this money using the link below.
            </div>
          ) : null}
        </div>

        {/* Right: sharing + secondary actions + activity */}
        <div className="space-y-6">
          {active ? (
            <div className="card p-6">
              <h2 className="text-[18px] font-bold text-ink">Share with {net.forName}</h2>
              <p className="mt-1 text-[15px] text-body">
                Send this link to {net.forName}. If the money ever opens to them, they&rsquo;ll be able to
                receive it here — no account needed.
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
