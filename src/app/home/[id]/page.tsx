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
import { countdown, formatMoney, statusLabel, windowProgress } from "@/lib/format";
import type { SafetyNetDetail } from "@/services/types";

export default function SafetyNetDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [net, setNet] = useState<SafetyNetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"checkin" | "close" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
  const tone =
    net.status === "RECEIVED" ? "received" : net.status === "CLOSED" ? "closed" : net.isOpen ? "open" : "active";

  return (
    <AppShell>
      <Link href="/home" className="text-[15px] font-semibold text-subtle hover:text-ink">
        ← Back
      </Link>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-[16px] text-subtle">For {net.forName} · {net.forRelationship}</p>
          <h1 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">{net.label}</h1>
        </div>
        <Badge tone={tone}>{statusLabel(net.status, net.isOpen)}</Badge>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Left: the lifeline + primary action */}
        <div className="card flex flex-col items-center p-8 text-center">
          <p className="font-display text-[44px] font-bold leading-none text-ink">
            {formatMoney(net.amount)}
          </p>
          <p className="mt-2 text-[15px] text-subtle">set aside</p>

          <div className="mt-7">
            {active ? (
              <LifelineRing
                progress={progress}
                open={net.isOpen}
                centerLabel={net.isOpen ? "Open" : remaining}
                centerSub={net.isOpen ? "for your family" : "until it opens to family"}
              />
            ) : (
              <LifelineRing progress={1} open centerLabel={net.status === "RECEIVED" ? "Received" : "Closed"} />
            )}
          </div>

          {active && !net.isOpen ? (
            <div className="mt-8 w-full">
              <Button fullWidth loading={busy === "checkin"} onClick={checkIn}>
                I&rsquo;m okay — check in
              </Button>
              <p className="mt-3 text-[14px] text-subtle">
                This keeps the money yours and resets the timer.
              </p>
            </div>
          ) : null}

          {active && net.isOpen ? (
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
                <code className="flex-1 truncate rounded-xl border border-line bg-paper px-4 py-3 text-[15px] text-ink">
                  {typeof window !== "undefined" ? `${window.location.origin}/claim/${net.claimCode}` : `…/claim/${net.claimCode}`}
                </code>
                <Button size="md" variant="secondary" onClick={copyLink}>
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="card p-6">
            <h2 className="text-[18px] font-bold text-ink">History</h2>
            <div className="mt-5">
              <ActivityTimeline items={net.activity} />
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
