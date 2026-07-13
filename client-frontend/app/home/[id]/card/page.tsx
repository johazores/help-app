"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authService } from "@/services/auth-service";
import { safetyNetService } from "@/services/safety-net-service";
import { formatMoney } from "@/lib/format";
import type { SafetyNetCardSummary } from "@/services/types";

async function generateClaimQr(claimCode: string): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  const url = `${window.location.origin}/claim/${claimCode}`;
  return QRCode.toDataURL(url, {
    margin: 1,
    width: 240,
    color: { dark: "#0C3B3A", light: "#FFFFFF" },
  });
}

/** A printable card the family can keep — the claim link as a scannable code. */
export default function ClaimCardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [net, setNet] = useState<SafetyNetCardSummary | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!authService.isSignedIn()) {
      router.replace("/sign-in");
      return;
    }
    safetyNetService
      .cardSummary(id)
      .then((n) => {
        setNet(n);
        return generateClaimQr(n.claimCode).then(setQr);
      })
      .catch(() => router.replace("/home"));
  }, [id, router]);

  if (!net) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-ink">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper py-8">
      <div className="mx-auto max-w-md px-5">
        <div className="print:hidden">
          <button onClick={() => router.back()} className="text-[15px] font-semibold text-subtle hover:text-ink">← Back</button>
          <h1 className="mt-2 font-display text-[26px] font-bold text-ink">Print a card for {net.forName}</h1>
          <p className="mt-1 text-[15px] text-body">
            Print this and give it to them, so the link is never lost in messages.
          </p>
          <Button size="md" className="mt-4" onClick={() => window.print()}>Print this card</Button>
        </div>

        {/* The card itself */}
        <div className="card mt-6 p-8 text-center print:mt-0 print:border-2 print:shadow-none">
          <Logo className="justify-center" />
          <p className="mt-5 text-[15px] text-subtle">Money is set aside for</p>
          <p className="mt-1 break-words font-display text-[26px] font-bold leading-tight text-ink">{net.forName}</p>
          <p className="mt-3 break-words font-display text-[36px] font-bold text-ink">{formatMoney(net.amount)}</p>
          {qr ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={qr} alt="Scan to open your link" className="mx-auto mt-5 rounded-xl border border-line" />
          ) : (
            <div className="mx-auto mt-5 h-[240px] w-[240px] animate-pulse rounded-xl bg-line/60" />
          )}
          <div className="mt-5 text-left text-[14px] leading-relaxed text-body">
            <p className="font-semibold text-ink">How to use this card:</p>
            <p className="mt-1">1. Open your phone&rsquo;s camera and point it at the square code.</p>
            <p>2. Tap the link that appears.</p>
            <p>3. The page will tell you everything — you don&rsquo;t need an account.</p>
          </div>
          <p className="mt-5 border-t border-line pt-4 text-[13px] text-subtle">
            Keep this card somewhere safe, like an important document.
          </p>
        </div>
      </div>
    </div>
  );
}
