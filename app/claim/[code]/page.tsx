"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { claimService } from "@/services/claim-service";
import { formatDate, formatMoney, referenceId } from "@/lib/format";
import type { ClaimInfo } from "@/services/types";

type Screen = "loading" | "not-open" | "ready" | "received" | "gone" | "error";

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
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

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
    claimService
      .lookup(code)
      .then((data) => {
        setInfo(data);
        if (data.status === "RECEIVED") {
          setReceivedRef(referenceId(data.receivedTxHash, code));
          setScreen("received");
        } else if (data.status === "CLOSED") setScreen("gone");
        else if (data.isOpen) setScreen("ready");
        else setScreen("not-open");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "This link doesn't work.");
        setScreen("error");
      });
  }, [code]);

  // While waiting, quietly re-check so the screen opens on its own.
  useEffect(() => {
    if (screen !== "not-open") return;

    const poll = () => {
      if (document.visibilityState !== "visible") return;
      claimService
        .lookup(code)
        .then((data) => {
          setInfo(data);
          if (data.isOpen) setScreen("ready");
        })
        .catch(() => {});
    };

    const t = setInterval(poll, 12_000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [screen, code]);

  async function receive() {
    setClaiming(true);
    setError(null);
    try {
      const result = await claimService.claim(code);
      setReceivedAmount(result.amount);
      setReceivedRef(referenceId(result.txHash, code));
      setScreen("received");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't receive the money.");
      setClaiming(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="container-page flex h-16 items-center">
        <Logo />
      </header>

      <div className="container-page flex flex-1 items-start justify-center py-6 sm:items-center sm:py-10">
        <div className="w-full max-w-md">
          {/* Loading */}
          {screen === "loading" ? (
            <div className="py-16 text-center">
              <Spinner className="mx-auto h-8 w-8 text-ink" />
              <p className="mt-4 text-[17px] text-body">Opening your link…</p>
            </div>
          ) : null}

          {/* Broken link */}
          {screen === "error" ? (
            <div className="card overflow-hidden p-6 text-center sm:p-8">
              <h1 className="font-display text-[26px] font-bold leading-tight text-ink">
                Hmm, this link isn&rsquo;t working
              </h1>
              <p className="mt-2 text-[17px] text-body">
                Please check that you opened the full link, exactly as it was sent to you. If it
                still doesn&rsquo;t work, ask the person who sent it to share it again.
              </p>
            </div>
          ) : null}

          {/* Not open yet — reassure, explain, no action needed */}
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

          {/* Ready — explain exactly what Receive does before they tap */}
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
                  Tapping Receive makes this money yours, kept safe here in Sagip under your name.
                </p>
              </div>

              {error ? (
                <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-[15px] font-medium text-danger" role="alert">
                  {error} You can simply try again — nothing is lost.
                </p>
              ) : null}

              <div className="mt-6 rounded-xl bg-ink/5 p-4 text-left text-[14px] leading-relaxed text-body">
                <p className="font-semibold text-ink">Good to know</p>
                <p className="mt-1">
                  Moving this money to GCash, Maya, or a bank account isn&rsquo;t available just yet —
                  we&rsquo;re working with licensed payment partners to add it. Until then, your money
                  stays safe here, and you can come back to this page anytime.
                </p>
              </div>
            </div>
          ) : null}

          {/* Received — success + honest withdraw preview */}
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
                  </p>
                ) : null}
                <p className="mt-3 text-[14px] text-subtle">
                  Save this link — it&rsquo;s your proof, and it&rsquo;s where withdrawing will happen.
                </p>
              </div>

              {/* Withdraw — coming soon, clearly not available yet */}
              <div className="card mt-4 overflow-hidden p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[18px] font-bold text-ink">Move it to your pocket</h2>
                  <span className="shrink-0 rounded-full bg-marigold/20 px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-marigold-deep">
                    Coming soon
                  </span>
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-body">
                  Soon you&rsquo;ll be able to move this money straight to:
                </p>
                <div className="mt-4 space-y-2" aria-disabled="true">
                  {["GCash", "Maya", "Bank account"].map((option) => (
                    <div
                      key={option}
                      className="flex items-center justify-between rounded-xl border border-line bg-paper/60 px-4 py-3.5 opacity-60"
                    >
                      <span className="text-[16px] font-semibold text-ink">{option}</span>
                      <span className="text-[13px] font-semibold text-subtle">Not yet available</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[14px] leading-relaxed text-subtle">
                  We&rsquo;re partnering with licensed payment providers in the Philippines to make
                  this possible. Your money is safe here in the meantime — nothing expires, and no
                  one else can touch it.
                </p>
              </div>
            </>
          ) : null}

          {/* Taken back */}
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
