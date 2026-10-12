"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { PinInput } from "@/components/ui/pin-input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { PageSpinner } from "@/components/ui/spinner";
import { LoadErrorBanner } from "@/components/load-error-banner";
import { authService } from "@/services/auth-service";
import { paluwaganClient, type PaluwaganDetail } from "@/services/paluwagan-service";
import { handleProtectedLoadError, loadErrorMessage } from "@/lib/api-errors";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useCopy } from "@/lib/use-copy";

export default function PaluwaganGroupPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [group, setGroup] = useState<PaluwaganDetail | null>(null);
  const [pin, setPin] = useState("");
  const [action, setAction] = useState<"start" | "pay" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { copy, copied, failed: copyFailed } = useCopy();

  const load = useCallback(async () => {
    try {
      setGroup(await paluwaganClient.detail(id));
      setLoadError(null);
    } catch (err) {
      if (handleProtectedLoadError(err, router, () => authService.signOut()) === "error") {
        setLoadError(loadErrorMessage(err));
      }
    }
  }, [id, router]);

  useEffect(() => {
    if (!authService.isSignedIn()) {
      router.replace("/sign-in");
      return;
    }
    void load();
  }, [load, router]);

  function closeAction() {
    if (busy) return;
    setAction(null);
    setPin("");
    setError(null);
  }

  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (!action || busy) return;
    if (pin.length !== 6) return setError("Please enter your 6-number PIN.");
    setBusy(true);
    setError(null);
    try {
      if (action === "start") await paluwaganClient.start(id, pin);
      else await paluwaganClient.contribute(id, pin);
    } catch (err) {
      setError(loadErrorMessage(err));
      setBusy(false);
      return;
    }
    setNotice(action === "start" ? "The group has started. Round 1 is collecting now." : "Your share was sent.");
    setAction(null);
    setPin("");
    setBusy(false);
    await load();
  }

  if (!group) {
    return (
      <AppShell>
        {loadError ? (
          <>
            <LoadErrorBanner message={loadError} onRetry={() => void load()} />
            <Link href="/home/paluwagan" className="mt-4 inline-flex min-h-11 items-center font-semibold text-ink underline">
              ← Paluwagan
            </Link>
          </>
        ) : (
          <PageSpinner />
        )}
      </AppShell>
    );
  }

  const current = group.cycles.find((c) => c.status === "COLLECTING") ?? null;
  const myShare = current?.paid.find((p) => p.isMe)?.status;
  const iPaid = myShare === "PAID";
  const paidCount = current ? current.paid.filter((p) => p.status === "PAID").length : 0;
  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/paluwagan/invite/${group.inviteCode}` : "";
  const pot = Number(group.amount) * (group.memberCount - 1);

  return (
    <AppShell>
      <Link href="/home/paluwagan" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-subtle hover:text-ink">
        ← Paluwagan
      </Link>
      <div className="mt-1 flex items-start justify-between gap-3">
        <h1 className="min-w-0 break-words font-display text-[28px] font-bold leading-tight text-ink sm:text-[34px]">{group.name}</h1>
        <Badge tone={group.status === "ACTIVE" ? "active" : group.status === "COMPLETED" ? "received" : "open"}>
          {group.status === "DRAFT" ? "Gathering" : group.status === "ACTIVE" ? "Running" : "Finished"}
        </Badge>
      </div>
      <p className="mt-1 text-[15px] text-subtle">
        {formatMoney(group.amount)} per member each round · {group.memberCount} members
      </p>

      <div aria-live="polite">
        {notice ? (
          <p className="mt-4 max-w-3xl rounded-xl bg-sage/15 px-4 py-3 text-[15px] font-semibold text-ink">{notice}</p>
        ) : null}
      </div>

      <div className="mt-6 grid max-w-3xl gap-5 lg:grid-cols-2">
        {/* Current round / draft actions */}
        <div className="space-y-5">
          {group.status === "DRAFT" ? (
            <div className="card p-6">
              <h2 className="text-[18px] font-bold text-ink">Invite your people</h2>
              <p className="mt-1 text-[15px] text-body">Share this link. Each person joins with their own Sagip account.</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <code className="min-w-0 flex-1 break-all rounded-xl border border-line bg-paper px-4 py-3 text-[13px] leading-relaxed text-ink">{inviteUrl}</code>
                <Button size="md" variant="secondary" onClick={() => void copy(inviteUrl, "invite")}>
                  {copied === "invite" ? "Copied" : "Copy"}
                </Button>
              </div>
              {copyFailed ? (
                <p className="mt-2 text-[14px] text-danger" role="alert">
                  Couldn&rsquo;t copy automatically — press and hold the link to copy it.
                </p>
              ) : null}
              {group.iAmOwner ? (
                <div className="mt-5 border-t border-line pt-4">
                  <p className="text-[14px] text-body">
                    Once everyone&rsquo;s in, start the group. The rules lock and the first round begins.
                  </p>
                  <Button size="md" className="mt-3" onClick={() => setAction("start")} disabled={group.memberCount < 2}>
                    Start with {group.memberCount} member{group.memberCount === 1 ? "" : "s"}
                  </Button>
                </div>
              ) : (
                <p className="mt-4 text-[14px] text-subtle">Waiting for the owner to start the group.</p>
              )}
            </div>
          ) : null}

          {current ? (
            <div className="card border-2 border-ink p-6">
              <p className="text-[14px] font-bold uppercase tracking-wide text-subtle">Round {current.cycleNumber} of {group.memberCount}</p>
              <p className="mt-2 text-[18px] font-bold text-ink">
                {current.recipientIsMe ? "It's your turn to receive 🎉" : `This round goes to ${current.recipientName}`}
              </p>
              <p className="mt-1 text-[15px] text-body">
                {current.recipientIsMe
                  ? `Each member sends you ${formatMoney(group.amount)} — about ${formatMoney(pot)} in total.`
                  : `Send your ${formatMoney(group.amount)} share by ${formatDateTime(current.dueAt)}.`}
              </p>
              <p className="mt-3 text-[14px] text-subtle">{paidCount} of {group.memberCount - 1} shares are in.</p>
              {!current.recipientIsMe ? (
                iPaid ? (
                  <p className="mt-4 rounded-xl bg-sage/15 px-4 py-3 text-[15px] font-semibold text-ink">Your share is in for this round ✓</p>
                ) : myShare === "PAYING" ? (
                  <p className="mt-4 rounded-xl bg-marigold/15 px-4 py-3 text-[15px] font-semibold text-ink">
                    Your share is going through. Refresh in a moment.
                  </p>
                ) : (
                  <Button fullWidth className="mt-4" onClick={() => setAction("pay")}>
                    Send my {formatMoney(group.amount)} share
                  </Button>
                )
              ) : null}
            </div>
          ) : null}

          {group.status === "COMPLETED" ? (
            <div className="card p-6 text-center">
              <p className="text-[18px] font-bold text-ink">All rounds complete 🎉</p>
              <p className="mt-1 text-[15px] text-body">Everyone has received once. Salamat sa tiwala!</p>
            </div>
          ) : null}
        </div>

        {/* Members & rounds */}
        <div className="space-y-5">
          <div className="card p-6">
            <h2 className="text-[18px] font-bold text-ink">Payout order</h2>
            <ul className="mt-3 divide-y divide-line">
              {group.members.map((m) => (
                <li key={m.position} className="flex items-center justify-between py-2.5">
                  <span className="text-[16px] font-semibold text-ink">
                    {m.position}. {m.name}
                    {m.isMe ? <span className="ml-2 text-[12px] font-bold text-sage-ink">You</span> : null}
                    {m.isOwner ? <span className="ml-2 text-[12px] font-bold text-subtle">Owner</span> : null}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] text-subtle">Order follows who joined first, and locks when the group starts.</p>
          </div>

          {group.status !== "DRAFT" ? (
            <div className="card p-6">
              <h2 className="text-[18px] font-bold text-ink">Rounds</h2>
              <ul className="mt-3 space-y-3">
                {group.cycles.map((c) => (
                  <li key={c.id} className="rounded-xl border border-line bg-paper/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[15px] font-semibold text-ink">Round {c.cycleNumber} → {c.recipientName}</p>
                      <Badge tone={c.status === "PAID_OUT" ? "received" : c.status === "COLLECTING" ? "open" : "neutral"}>
                        {c.status === "PAID_OUT" ? "Done" : c.status === "COLLECTING" ? "Collecting" : "Up next"}
                      </Badge>
                    </div>
                    {c.status !== "UPCOMING" ? (
                      <p className="mt-1 text-[13px] text-subtle">
                        {c.paid.filter((p) => p.status === "PAID").map((p) => p.memberName).join(", ") || "No shares in yet"}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog
        open={action !== null}
        onClose={closeAction}
        title={action === "start" ? "Start the group?" : "Send your share?"}
        description={
          action === "start"
            ? "The rules lock and round 1 begins. This can't be undone."
            : `${formatMoney(group.amount)} goes straight to ${current?.recipientName ?? "this round's member"}. This can't be undone.`
        }
      >
        <form onSubmit={confirm} noValidate>
          <label htmlFor="paluwagan-pin" className="field-label">Your 6-number PIN</label>
          <PinInput
            id="paluwagan-pin"
            value={pin}
            onValueChange={setPin}
            autoComplete="current-password"
            placeholder="••••••"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "paluwagan-error" : undefined}
            autoFocus
          />
          {error ? <p id="paluwagan-error" className="mt-3 text-[15px] font-medium text-danger" role="alert">{error}</p> : null}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row-reverse">
            <Button type="submit" fullWidth loading={busy}>Confirm</Button>
            <Button fullWidth variant="ghost" disabled={busy} onClick={closeAction}>Cancel</Button>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}
