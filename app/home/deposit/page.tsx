"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { AppShell } from "@/components/app-shell";
import { CurrencyConverter } from "@/components/currency-converter";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ratesService } from "@/services/rates-service";
import { walletService } from "@/services/wallet-service";
import { authService } from "@/services/auth-service";
import { convertFromXlm, formatFiat, formatMoney } from "@/lib/format";
import type { DepositInfo, Rates } from "@/services/types";

export default function DepositPage() {
  const router = useRouter();
  const [info, setInfo] = useState<DepositInfo | null>(null);
  const [rates, setRates] = useState<Rates | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authService.isSignedIn()) {
      router.replace("/sign-in");
      return;
    }
    walletService
      .depositInfo()
      .then((d) => {
        setInfo(d);
        return QRCode.toDataURL(d.address, { margin: 1, width: 220, color: { dark: "#0C3B3A", light: "#FFFFFF" } });
      })
      .then((url) => setQr(url))
      .catch(() => authService.signOut())
      .finally(() => setLoading(false));
    ratesService.get().then(setRates).catch(() => {});
  }, [router]);

  function copy() {
    if (!info) return;
    navigator.clipboard?.writeText(info.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function addFunds() {
    setAdding(true);
    setMessage(null);
    try {
      const res = await walletService.addTestFunds(500);
      setInfo((prev) => (prev ? { ...prev, balance: res.balance } : prev));
      setMessage("Added 500 in test funds to your account.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Couldn't add funds.");
    } finally {
      setAdding(false);
    }
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

  const php = rates?.rates.PHP;

  return (
    <AppShell>
      <Link href="/home" className="text-[15px] font-semibold text-subtle hover:text-ink">
        ← Back
      </Link>
      <h1 className="mt-3 font-display text-[30px] font-bold text-ink sm:text-[36px]">Add funds</h1>
      <p className="mt-2 max-w-xl text-[17px] text-body">
        Two ways to top up: receive funds to your address, or add test funds instantly while
        you&rsquo;re trying things out.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Balance + test funds */}
        <div className="space-y-6">
          <div className="card bg-ink p-6 text-paper">
            <p className="text-[15px] text-paper/70">You have</p>
            <p className="mt-1 break-words font-display text-[clamp(30px,8vw,40px)] font-bold leading-none">
              {formatMoney(info?.balance ?? "0")}
            </p>
            {php !== undefined ? (
              <p className="mt-2 text-[15px] text-marigold-soft">
                about {formatFiat(convertFromXlm(info?.balance ?? "0", php), "PHP")} today
              </p>
            ) : null}
          </div>

          <div className="card p-6">
            <h2 className="text-[18px] font-bold text-ink">Add test funds</h2>
            <p className="mt-1 text-[15px] text-body">
              While Sagip is in testing, you can add practice funds instantly to try sending and
              receiving. This isn&rsquo;t real money.
            </p>
            <div className="mt-4">
              <Button loading={adding} onClick={addFunds}>
                Add 500 test funds
              </Button>
            </div>
            {message ? <p className="mt-3 text-[15px] font-medium text-ink">{message}</p> : null}
          </div>
        </div>

        {/* Receive address */}
        <div className="card p-6">
          <h2 className="text-[18px] font-bold text-ink">Receive to your address</h2>
          <p className="mt-1 text-[15px] text-body">
            Have someone send funds to the address below, or scan the code.
          </p>
          <div className="mt-5 flex flex-col items-center">
            {qr ? (
              <img src={qr} alt="Your deposit address as a scannable code" className="rounded-xl border border-line" />
            ) : (
              <div className="h-[220px] w-[220px] animate-pulse rounded-xl bg-line/60" />
            )}
          </div>
          <div className="mt-5">
            <p className="field-label">Your address</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <code className="min-w-0 flex-1 break-all rounded-xl border border-line bg-paper px-4 py-3 text-[13px] leading-relaxed text-ink">
                {info?.address}
              </code>
              <Button size="md" variant="secondary" onClick={copy}>
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <CurrencyConverter
          defaultFrom="XLM"
          defaultTo="PHP"
          defaultAmount={info ? String(Number(info.balance)) : "100"}
        />
      </div>
    </AppShell>
  );
}
