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

export default function ClaimPage() {
  const params = useParams<{ code: string }>();
  const code = params?.code ?? "";

  const [screen, setScreen] = useState<Screen>("loading");
  const [info, setInfo] = useState<ClaimInfo | null>(null);
  const [receivedAmount, setReceivedAmount] = useState<string>("");
  const [receivedRef, setReceivedRef] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    claimService
      .lookup(code)
      .then((data) => {
        setInfo(data);
        if (data.status === "RECEIVED") setScreen("received");
        else if (data.status === "CLOSED") setScreen("gone");
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
    const t = setInterval(() => {
      claimService
        .lookup(code)
        .then((data) => {
          setInfo(data);
          if (data.isOpen) setScreen("ready");
        })
        .catch(() => {});
    }, 8000);
    return () => clearInterval(t);
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

      <div className="container-page flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md">
          {screen === "loading" ? (
            <div className="flex justify-center py-16 text-ink">
              <Spinner className="h-7 w-7" />
            </div>
          ) : null}

          {screen === "error" ? (
            <div className="card overflow-hidden p-6 text-center sm:p-8">
              <h1 className="font-display text-[26px] font-bold text-ink">This link doesn&rsquo;t work</h1>
              <p className="mt-2 text-[17px] text-body">{error}</p>
            </div>
          ) : null}

          {screen === "not-open" && info ? (
            <div className="card overflow-hidden p-6 text-center sm:p-8">
              <p className="break-words text-[16px] text-subtle">From {info.fromName}, for you</p>
              <h1 className="mt-1 break-words font-display text-[26px] font-bold leading-tight text-ink">{info.label}</h1>
              <p className="mt-6 break-words font-display text-[clamp(32px,9vw,44px)] font-bold leading-tight text-ink">{formatMoney(info.amount)}</p>
              <div className="mt-6 rounded-xl bg-ink/5 p-5 text-[16px] text-body">
                This isn&rsquo;t open yet. It will become available on{" "}
                <span className="font-semibold text-ink">{formatDate(info.unlockAt)}</span> if{" "}
                {info.fromName} doesn&rsquo;t check in before then.
              </div>
              <p className="mt-4 text-[14px] text-subtle">You can come back to this link anytime.</p>
            </div>
          ) : null}

          {screen === "ready" && info ? (
            <div className="card overflow-hidden p-6 text-center sm:p-8">
              <p className="break-words text-[16px] text-subtle">From {info.fromName}, for you</p>
              <h1 className="mt-1 break-words font-display text-[26px] font-bold leading-tight text-ink">{info.label}</h1>
              <p className="mt-6 break-words font-display text-[clamp(34px,10vw,46px)] font-bold leading-tight text-ink">{formatMoney(info.amount)}</p>
              <p className="mt-2 text-[16px] text-body">This money is now yours to receive.</p>
              <div className="mt-7">
                <Button fullWidth loading={claiming} onClick={receive}>
                  Receive {formatMoney(info.amount)}
                </Button>
              </div>
              {error ? (
                <p className="mt-4 text-[15px] font-medium text-danger" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}

          {screen === "received" && info ? (
            <div className="card overflow-hidden p-6 text-center sm:p-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-marigold">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12.5 10 17 19 7" stroke="#0C3B3A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="mt-5 font-display text-[28px] font-bold text-ink">All received</h1>
              <p className="mt-2 text-[17px] text-body">
                {formatMoney(receivedAmount || info.amount)} from {info.fromName} is now yours.
              </p>
              {receivedRef ? (
                <p className="mt-4 rounded-xl bg-paper px-4 py-3 text-[14px] text-subtle">
                  Reference <span className="font-mono font-semibold text-ink">{receivedRef}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          {screen === "gone" && info ? (
            <div className="card overflow-hidden p-6 text-center sm:p-8">
              <h1 className="font-display text-[26px] font-bold text-ink">No longer available</h1>
              <p className="mt-2 text-[17px] text-body">
                {info.fromName} has taken this money back. Nothing more to do here.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
