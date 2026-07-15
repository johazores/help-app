"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { claimService } from "@/services/claim-service";
import { countdown, formatDate, formatMoney, referenceId } from "@/lib/format";
import type { ClaimInfo } from "@/services/types";

type Screen =
  | "loading"
  | "not-open"
  | "ready"
  | "received"
  | "guarded"
  | "backup-received"
  | "gone"
  | "error";

function resolveScreen(data: ClaimInfo): Screen {
  if (data.status === "CLOSED") return "gone";
  if (data.status === "BACKUP_RECEIVED") return "backup-received";
  if (data.status === "GUARDED") return "guarded";
  if (data.status === "RECEIVED") return "received";
  if (data.isOpen) return "ready";
  return "not-open";
}

/**
 * The receiver's journey. A loved one lands here from a link — often on a phone,
 * often without ever having used an app like this. Every state explains, in
 * plain words: what this is, what tapping the button does, and what comes next.
 */
export default function ClaimPage() {
  const params = useParams<{ code: string }>();
  const code = params?.code ?? "";

  const [screen, setScreen] = useState<Screen>("loading");
  const [info, setInfo] = useState<ClaimInfo | null>(null);
  const [receivedAmount, setReceivedAmount] = useState<string>("");
  const [receivedRef, setReceivedRef] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [backupClaiming, setBackupClaiming] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [, setTick] = useState(0);

  const refresh = useCallback(async () => {
    const data = await claimService.lookup(code);
    setInfo(data);
    setScreen(resolveScreen(data));
    if (data.receivedTxHash) {
      setReceivedRef(referenceId(data.receivedTxHash, code));
    }
    return data;
  }, [code]);

  async function requestEarly() {
    setRequesting(true);
    try {
      await claimService.requestEarly(code);
      setRequested(true);
    } catch {
      // Quietly ignore; the reassurance copy still applies.
    } finally {
      setRequesting(false);
    }
  }

  useEffect(() => {
    refresh().catch((err) => {
      setError(err instanceof Error ? err.message : "This link doesn't work.");
      setScreen("error");
    });
  }, [refresh]);

  useEffect(() => {
    if (screen !== "not-open" && screen !== "guarded") return;

    const poll = () => {
      if (document.visibilityState !== "visible") return;
      refresh().catch(() => {});
    };

    const t = setInterval(poll, 12_000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [screen, refresh]);

  useEffect(() => {
    if (screen !== "guarded") return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [screen]);

  async function receive() {
    setClaiming(true);
    setError(null);
    try {
      const result = await claimService.claim(code);
      setReceivedAmount(result.amount);
      setReceivedRef(referenceId(result.txHash, code));
      await refresh();
      setScreen(result.guarded ? "guarded" : "received");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't receive the money.");
    } finally {
      setClaiming(false);
    }
  }

  async function receiverCheckIn() {
    setCheckingIn(true);
    setError(null);
    try {
      await claimService.receiverCheckIn(code);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't check in.");
    } finally {
      setCheckingIn(false);
    }
  }

  async function backupReceive() {
    setBackupClaiming(true);
    setError(null);
    try {
      const result = await claimService.backupClaim(code);
      setReceivedAmount(result.amount);
      setReceivedRef(referenceId(result.txHash, code));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't receive the money.");
    } finally {
      setBackupClaiming(false);
    }
  }

  const guardRemaining =
    info?.guardUnlockAt && screen === "guarded" ? countdown(info.guardUnlockAt).text : null;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="container-page flex h-16 items-center justify-between">
        <Logo />
        <Link href="/claim/recover" className="text-[14px] font-semibold text-subtle hover:text-ink">
          Lost your link?
        </Link>
      </header>

      <div className="container-page flex flex-1 items-start justify-center py-6 sm:items-center sm:py-10">
        <div className="w-full max-w-md">
          {screen === "loading" ? (
            <div className="py-16 text-center">
              <Spinner className="mx-auto h-8 w-8 text-ink" />
              <p className="mt-4 text-[17px] text-body">Opening your link…</p>
            </div>
          ) : null}

          {screen === "error" ? (
            <div className="card overflow-hidden p-6 text-center sm:p-8">
              <h1 className="font-display text-[26px] font-bold leading-tight text-ink">
                Hmm, this link isn&rsquo;t working
              </h1>
              <p className="mt-2 text-[17px] text-body">
                {error ?? "Please check that you opened the full link, exactly as it was sent to you."}
              </p>
            </div>
          ) : null}

          {screen === "not-open" && info ? (
            <>
              <div className="card overflow-hidden p-6 text-center sm:p-8">
                <p className="break-words text-[16px] text-subtle">
                  {info.fromName} set this aside for you
                </p>
                <h1 className="mt-1 break-words font-display text-[26px] font-bold leading-tight text-ink">
                  {info.label}
                </h1>
                <p className="mt-6 break-words font-display text-[clamp(32px,9vw,44px)] font-bold leading-tight text-ink">
                  {formatMoney(info.amount)}
                </p>
                <div className="mt-6 rounded-xl bg-ink/5 p-5 text-left text-[16px] leading-relaxed text-body">
                  <p className="font-semibold text-ink">You don&rsquo;t need to do anything right now.</p>
                  <p className="mt-2">
                    {info.fromName} is keeping this money safe by checking in regularly. If they ever
                    can&rsquo;t — starting{" "}
                    <span className="font-semibold text-ink">{formatDate(info.unlockAt)}</span> — it
                    opens to you, and this page will let you receive it.
                  </p>
                </div>
              </div>
              {info.kind !== "GIFT" ? (
                <div className="card mt-4 overflow-hidden p-5 text-center">
                  {requested || info.requestState === "REQUESTED" ? (
                    <p className="text-[15px] leading-relaxed text-body">
                      <span className="font-semibold text-ink">We&rsquo;ve let {info.fromName} know.</span>{" "}
                      If they open it for you, this page will show a Receive button.
                    </p>
                  ) : (
                    <>
                      <p className="text-[15px] leading-relaxed text-body">
                        Is this an emergency? You can ask {info.fromName} to open it for you now.
                      </p>
                      <Button size="md" variant="ghost" className="mt-3" loading={requesting} onClick={requestEarly}>
                        Ask to open it now
                      </Button>
                    </>
                  )}
                </div>
              ) : null}
              <p className="mt-4 text-center text-[14px] text-subtle">
                Keep this link safe. You can open it anytime to check.
              </p>
            </>
          ) : null}

          {screen === "ready" && info ? (
            <div className="card overflow-hidden p-6 text-center sm:p-8">
              <p className="break-words text-[16px] text-subtle">From {info.fromName}, for you</p>
              <h1 className="mt-1 break-words font-display text-[26px] font-bold leading-tight text-ink">
                {info.label}
              </h1>
              <p className="mt-6 break-words font-display text-[clamp(34px,10vw,46px)] font-bold leading-tight text-ink">
                {formatMoney(info.amount)}
              </p>
              <p className="mt-2 text-[16px] text-body">This money is ready for you.</p>

              <div className="mt-6">
                <Button fullWidth loading={claiming} onClick={receive}>
                  Receive {formatMoney(info.amount)}
                </Button>
                <p className="mt-3 text-[14px] leading-relaxed text-subtle">
                  {info.hasBackup && info.backupName
                    ? `After you receive, you'll need to check in on this link now and then. If you pass away or can't, ${info.backupName} receives it next — ${info.fromName} set that up for you.`
                    : "Tapping Receive makes this money yours, kept safe here in Sagip under your name."}
                </p>
              </div>

              {error ? (
                <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-[15px] font-medium text-danger" role="alert">
                  {error} You can simply try again — nothing is lost.
                </p>
              ) : null}
            </div>
          ) : null}

          {screen === "guarded" && info ? (
            <>
              <div className="card overflow-hidden p-6 text-center sm:p-8">
                <p className="text-[16px] text-subtle">For {info.forName}</p>
                <h1 className="mt-1 font-display text-[26px] font-bold leading-tight text-ink">
                  This money is yours
                </h1>
                <p className="mt-6 font-display text-[clamp(32px,9vw,44px)] font-bold leading-tight text-ink">
                  {formatMoney(info.amount)}
                </p>
                <div className="mt-6 rounded-xl bg-sage/10 p-5 text-left text-[15px] leading-relaxed text-body">
                  <p className="font-semibold text-ink">Tap &ldquo;I&rsquo;m okay&rdquo; now and then</p>
                  <p className="mt-2">
                    Each check-in keeps this money in your hands. If you pass away or ever can&rsquo;t check
                    in
                    {info.guardUnlockAt ? (
                      <>
                        {" "}
                        — from{" "}
                        <span className="font-semibold text-ink">{formatDate(info.guardUnlockAt)}</span>
                      </>
                    ) : null}
                    {info.backupName ? (
                      <>
                        {" "}
                        — <span className="font-semibold text-ink">{info.backupName}</span> will receive
                        it instead.
                      </>
                    ) : null}
                  </p>
                  {guardRemaining && !info.guardIsOpen ? (
                    <p className="mt-3 text-[14px] font-semibold text-sage">
                      Next check-in window opens in {guardRemaining}
                    </p>
                  ) : null}
                </div>
                <div className="mt-6">
                  <Button fullWidth loading={checkingIn} onClick={receiverCheckIn}>
                    I&rsquo;m okay — check in
                  </Button>
                </div>
                {error ? (
                  <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-[15px] font-medium text-danger" role="alert">
                    {error}
                  </p>
                ) : null}
                <p className="mt-4 text-[14px] text-subtle">
                  Save this link somewhere safe. If you lose your phone, use{" "}
                  <Link href="/claim/recover" className="font-semibold text-ink underline">
                    Find your link
                  </Link>{" "}
                  or ask {info.fromName} to send it again.
                </p>
              </div>

              {info.backupName && info.guardIsOpen ? (
                <div className="card mt-4 overflow-hidden p-6 text-center">
                  <h2 className="text-[18px] font-bold text-ink">For {info.backupName}</h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-body">
                    {info.forName} hasn&rsquo;t checked in — this may mean they passed away or can no longer
                    act. If you&rsquo;re {info.backupName}, you can receive this money now.
                  </p>
                  <div className="mt-4">
                    <Button fullWidth loading={backupClaiming} onClick={backupReceive}>
                      Receive {formatMoney(info.amount)}
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {screen === "received" && info ? (
            <>
              <div className="card overflow-hidden p-6 text-center sm:p-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-marigold">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 12.5 10 17 19 7" stroke="#0C3B3A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h1 className="mt-5 font-display text-[28px] font-bold leading-tight text-ink">
                  This money is now yours
                </h1>
                <p className="mt-2 text-[17px] leading-relaxed text-body">
                  {formatMoney(receivedAmount || info.amount)} from {info.fromName} is safely yours,
                  kept here in Sagip under your name.
                </p>
                {receivedRef ? (
                  <p className="mt-4 rounded-xl bg-paper px-4 py-3 text-[14px] text-subtle">
                    Your receipt number:{" "}
                    <span className="font-mono font-semibold text-ink">{receivedRef}</span>
                    <span className="mt-1 block text-[13px]">Saved permanently — not just in the app.</span>
                  </p>
                ) : null}
                <p className="mt-5 rounded-xl border border-line bg-paper/60 px-4 py-3 text-[14px] leading-relaxed text-body">
                  <span className="font-semibold text-ink">Move it to your pocket</span> — GCash, Maya, and
                  bank transfer are coming soon. Your money is safe here under your name until then.
                </p>
              </div>
            </>
          ) : null}

          {screen === "backup-received" && info ? (
            <div className="card overflow-hidden p-6 text-center sm:p-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-marigold">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12.5 10 17 19 7" stroke="#0C3B3A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="mt-5 font-display text-[28px] font-bold leading-tight text-ink">
                This money is now yours
              </h1>
              <p className="mt-2 text-[17px] leading-relaxed text-body">
                {formatMoney(receivedAmount || info.amount)} is safely yours. {info.forName} couldn&rsquo;t
                keep checking in, so {info.fromName} asked Sagip to pass it to you as backup.
              </p>
              {receivedRef ? (
                <p className="mt-4 rounded-xl bg-paper px-4 py-3 text-[14px] text-subtle">
                  Your receipt number:{" "}
                  <span className="font-mono font-semibold text-ink">{receivedRef}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          {screen === "gone" && info ? (
            <div className="card overflow-hidden p-6 text-center sm:p-8">
              <h1 className="font-display text-[26px] font-bold leading-tight text-ink">
                This is no longer available
              </h1>
              <p className="mt-2 text-[17px] leading-relaxed text-body">
                {info.fromName} has taken this money back — that&rsquo;s something they can do while
                it&rsquo;s still theirs. There&rsquo;s nothing you need to do.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
