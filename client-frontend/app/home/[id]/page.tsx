"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SafetyNetLifeline } from "@/components/safety-net-lifeline";
import { ActivityTimeline } from "@/components/activity-timeline";
import { LoadErrorBanner } from "@/components/load-error-banner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { PageSpinner } from "@/components/ui/spinner";
import { authService } from "@/services/auth-service";
import { safetyNetService } from "@/services/safety-net-service";
import { configService } from "@/services/config-service";
import { handleProtectedLoadError, loadErrorMessage } from "@/lib/api-errors";
import { formatDate, formatDateTime, formatMoney, statusLabel, statusTone } from "@/lib/format";
import { useCopy } from "@/lib/use-copy";
import type { AppConfig, SafetyNetDetail } from "@/services/types";

type Action = "checkin" | "close" | "approve" | "dismiss";

export default function SafetyNetDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [net, setNet] = useState<SafetyNetDetail | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Action | null>(null);
  const [confirming, setConfirming] = useState<"close" | "approve" | null>(null);
  const [actionError, setActionError] = useState<{ action: Action; message: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState(false);
  const { copy, copied, failed: copyFailed } = useCopy();

  const load = useCallback(async () => {
    try {
      setNet(await safetyNetService.detail(id));
      setLoadError(null);
    } catch (err) {
      if (handleProtectedLoadError(err, router, () => authService.signOut()) === "error") {
        setLoadError(loadErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (!authService.isSignedIn()) {
      router.replace("/sign-in");
      return;
    }
    void load();
    configService.get().then(setConfig).catch(() => {});
    setJustCreated(new URLSearchParams(window.location.search).get("created") === "1");
  }, [load, router]);

  /**
   * Runs one money action at a time. Success is reported from the action's
   * own result; a failed follow-up refresh never turns a confirmed change
   * into an error message.
   */
  async function run(action: Action, perform: () => Promise<unknown>, success?: string) {
    if (busy) return;
    setBusy(action);
    setActionError(null);
    setNotice(null);
    try {
      await perform();
    } catch (err) {
      setActionError({ action, message: loadErrorMessage(err) });
      setBusy(null);
      return;
    }
    setConfirming(null);
    setJustCreated(false);
    if (success) setNotice(success);
    await load();
    setBusy(null);
  }

  if (loading) {
    return (
      <AppShell>
        <PageSpinner />
      </AppShell>
    );
  }

  if (!net) {
    return (
      <AppShell>
        {loadError ? (
          <LoadErrorBanner message={loadError} onRetry={() => void load()} />
        ) : (
          <p className="text-[17px] text-body">This safety net doesn&rsquo;t exist.</p>
        )}
        <Link href="/home" className="mt-4 inline-flex min-h-11 items-center font-semibold text-ink underline">
          Back home
        </Link>
      </AppShell>
    );
  }

  const active = net.status === "ACTIVE";
  const openNow = active && Date.parse(net.unlockAt) <= Date.now();
  const checkIns = net.activity.filter((a) => a.type === "CHECKED_IN").length;
  const claimUrl =
    typeof window !== "undefined" ? `${window.location.origin}/claim/${net.claimCode}` : `/claim/${net.claimCode}`;
  const showShareLink =
    net.status === "ACTIVE" ||
    net.status === "GUARDED" ||
    net.status === "RECEIVED" ||
    net.status === "BACKUP_RECEIVED";

  const errorFor = (action: Action) =>
    actionError?.action === action ? (
      <p className="mt-3 text-[15px] font-medium text-danger" role="alert">
        {actionError.message}
      </p>
    ) : null;

  return (
    <AppShell>
      <Link href="/home" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-subtle hover:text-ink">
        ← Back
      </Link>
      {loadError ? (
        <div className="mt-3">
          <LoadErrorBanner message={loadError} onRetry={() => void load()} />
        </div>
      ) : null}

      <div className="mt-1 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[16px] text-subtle">For {net.forName} · {net.forRelationship}</p>
          <h1 className="break-words font-display text-[28px] font-bold leading-tight text-ink sm:text-[36px]">{net.label}</h1>
        </div>
        <Badge tone={statusTone(net.status, openNow)}>{statusLabel(net.status, openNow)}</Badge>
      </div>

      {net.requestState === "REQUESTED" && active && !openNow ? (
        <div className="mt-5 rounded-2xl border-2 border-marigold bg-marigold/10 p-5">
          <p className="text-[17px] font-bold text-ink">{net.forName} is asking to receive this now</p>
          <p className="mt-1 text-[15px] text-body">
            If it&rsquo;s an emergency, you can open it for them right away. Otherwise, dismiss this and
            everything stays as it is.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button size="md" disabled={busy !== null} onClick={() => setConfirming("approve")}>
              Open it for {net.forName} now
            </Button>
            <Button
              size="md"
              variant="ghost"
              loading={busy === "dismiss"}
              disabled={busy !== null}
              onClick={() => run("dismiss", () => safetyNetService.dismissEarly(net.id))}
            >
              Dismiss
            </Button>
          </div>
          {errorFor("dismiss")}
        </div>
      ) : null}

      <Dialog
        open={confirming === "approve"}
        onClose={() => (busy === null ? setConfirming(null) : undefined)}
        title={`Open this for ${net.forName} now?`}
        description={
          <>
            {net.forName} will be able to receive {formatMoney(net.amount)} right away. Once they
            receive it, you can&rsquo;t take it back.
          </>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            fullWidth
            loading={busy === "approve"}
            onClick={() =>
              run(
                "approve",
                () => safetyNetService.approveEarly(net.id),
                `It's open. ${net.forName} can now receive it with their link.`,
              )
            }
          >
            Yes, open it now
          </Button>
          <Button fullWidth variant="ghost" disabled={busy !== null} onClick={() => setConfirming(null)}>
            Not now
          </Button>
        </div>
        {errorFor("approve")}
      </Dialog>

      <Dialog
        open={confirming === "close"}
        onClose={() => (busy === null ? setConfirming(null) : undefined)}
        title={`Take back ${formatMoney(net.amount)}?`}
        description={
          <>The money returns to your wallet and {net.forName} will no longer be able to receive it.</>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            fullWidth
            variant="danger"
            loading={busy === "close"}
            onClick={() => run("close", () => safetyNetService.close(net.id), "The money is back in your wallet.")}
          >
            Yes, take it back
          </Button>
          <Button fullWidth variant="ghost" disabled={busy !== null} onClick={() => setConfirming(null)}>
            Keep it set aside
          </Button>
        </div>
        {errorFor("close")}
      </Dialog>

      <div aria-live="polite">
        {notice ? (
          <div className="mt-5 rounded-2xl border border-sage/40 bg-sage/10 px-5 py-4">
            <p className="text-[17px] font-bold text-ink">{notice}</p>
            {active && !openNow && net.kind !== "GIFT" ? (
              <p className="mt-1 text-[15px] text-body">
                If you don&rsquo;t check in again, it opens to {net.forName} on {formatDateTime(net.unlockAt)}.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {justCreated ? (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-sage/40 bg-sage/10 p-5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-ink text-paper">
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
        <div>
          <SafetyNetLifeline
            amount={net.amount}
            status={net.status}
            kind={net.kind}
            unlockAt={net.unlockAt}
            lastCheckInAt={net.lastCheckInAt}
            checkingIn={busy === "checkin"}
            disabled={busy !== null}
            checkIns={checkIns}
            onCheckIn={() =>
              run("checkin", () => safetyNetService.checkIn(net.id), "You're checked in. The money stays yours.")
            }
          />
          {errorFor("checkin")}
        </div>

        <div className="space-y-6">
          {showShareLink ? (
            <div className="card p-6">
              <h2 className="text-[18px] font-bold text-ink">
                {active ? `Share with ${net.forName}` : "Their link"}
              </h2>
              <p className="mt-1 text-[15px] text-body">
                {active ? (
                  <>
                    Send this link to {net.forName}. If the money ever opens to them, they&rsquo;ll be able to
                    receive it there — no account needed.
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
                  {claimUrl}
                </code>
                <Button size="md" variant="secondary" onClick={() => void copy(claimUrl, "link")}>
                  {copied === "link" ? "Copied" : "Copy link"}
                </Button>
              </div>
              <p className="mt-2 text-[14px]" aria-live="polite">
                {copyFailed ? (
                  <span className="text-danger">
                    Couldn&rsquo;t copy automatically — press and hold the link to copy it.
                  </span>
                ) : copied === "link" ? (
                  <span className="sr-only">Link copied.</span>
                ) : null}
              </p>
              <Link
                href={`/home/${net.id}/card`}
                className="inline-flex min-h-11 items-center text-[14px] font-semibold text-ink underline"
              >
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
              <h2 className="text-[18px] font-bold text-ink">Backup is in place</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-body">
                {net.forName} received this money and checks in on their link. If they pass away or
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
                Changed your mind? You can return this money to yourself at any time while it&rsquo;s
                still set aside.
              </p>
              <div className="mt-4">
                <Button variant="danger" size="md" disabled={busy !== null} onClick={() => setConfirming("close")}>
                  Take back {formatMoney(net.amount)}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
