"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/app-shell";
import { CardSkeleton } from "@/components/page-skeleton";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/auth-service";
import { walletService } from "@/services/wallet-service";
import { ratesService } from "@/services/rates-service";
import { handleProtectedLoadError, loadErrorMessage } from "@/lib/api-errors";
import { LoadErrorBanner } from "@/components/load-error-banner";
import { DataUrlImage } from "@/components/ui/data-url-image";
import { convertFromHeld, formatFiat, formatMoney } from "@/lib/format";
import type { DepositInfo, Rates } from "@/services/types";

const CurrencyConverter = dynamic(
  () => import("@/components/currency-converter").then((module) => module.CurrencyConverter),
  { loading: () => <CardSkeleton lines={4} /> },
);

const TOP_UP_AMOUNTS = [100, 500, 1000];

async function generateQr(address: string): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(address, {
    margin: 1,
    width: 220,
    color: { dark: "#0C3B3A", light: "#FFFFFF" },
  });
}

export default function DepositPage() {
  const router = useRouter();
  const [info, setInfo] = useState<DepositInfo | null>(null);
  const [rates, setRates] = useState<Rates | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(500);
  const [notice, setNotice] = useState<{ text: string; bad?: boolean } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const deposit = await walletService.depositInfo();
      setInfo(deposit);
      setQr(await generateQr(deposit.address));

      try {
        setRates(await ratesService.get());
      } catch {
        // Rates are helpful but must never block receiving or adding funds.
        setRates(null);
      }
    } catch (error) {
      if (handleProtectedLoadError(error, router, () => authService.signOut()) !== "error") return;
      setLoadError(loadErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!authService.isSignedIn()) {
      router.replace("/sign-in");
      return;
    }
    void load();
  }, [router, load]);

  async function copy() {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(info.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice({ text: "Copying isn't available in this browser. Press and hold the address instead.", bad: true });
    }
  }

  async function addFunds() {
    setAdding(true);
    setNotice(null);
    try {
      const result = await walletService.addTestFunds(topUpAmount);
      setInfo((previous) => (previous ? { ...previous, balance: result.balance } : previous));

      ratesService.clear();
      try {
        setRates(await ratesService.refresh());
      } catch {
        setRates(null);
      }

      setNotice({
        text: result.switchedAsset
          ? `Added ${topUpAmount} test ${result.asset}. This deployment had no funded USDC treasury, so Sagip safely switched the test environment to XLM.`
          : `Added ${topUpAmount} test ${result.asset} to your wallet.`,
      });
    } catch (error) {
      setNotice({
        text: error instanceof Error ? error.message : "Couldn't add test funds. Please try again.",
        bad: true,
      });
    } finally {
      setAdding(false);
    }
  }

  if (loading && !info && !loadError) {
    return (
      <AppShell>
        <CardSkeleton lines={2} />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <CardSkeleton lines={5} />
          <CardSkeleton lines={5} />
        </div>
      </AppShell>
    );
  }

  const php = rates?.rates.PHP;
  const stable = rates?.base === "USDC";

  return (
    <AppShell>
      {loadError && !info ? (
        <LoadErrorBanner message={loadError} onRetry={() => void load()} />
      ) : (
        <>
          <Link href="/home" className="text-[15px] font-semibold text-subtle hover:text-ink">← Back</Link>
          <h1 className="mt-3 font-display text-[30px] font-bold text-ink sm:text-[36px]">Add funds</h1>
          <p className="mt-2 max-w-xl text-[17px] text-body">
            Receive test funds at your wallet address or use an instant test top-up. These balances have no real-world cash value.
          </p>

          {notice ? (
            <div
              role="status"
              className={`mt-5 max-w-3xl rounded-xl px-4 py-3 text-[15px] font-medium ${
                notice.bad ? "bg-danger/10 text-danger" : "bg-sage/15 text-ink"
              }`}
            >
              {notice.text}
            </div>
          ) : null}

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-6">
              <div className="card bg-ink p-6 text-paper">
                <p className="text-[15px] text-paper/70">{info?.walletName ? `${info.walletName} has` : "You have"}</p>
                <p className="mt-1 break-words font-display text-[clamp(30px,8vw,40px)] font-bold leading-none">
                  {formatMoney(info?.balance ?? "0")}
                </p>
                {rates ? (
                  <p className="mt-1 text-[13px] text-paper/60">
                    Test {rates.base}{stable ? " · stable-value preview" : " · network asset"}
                  </p>
                ) : null}
                {php !== undefined ? (
                  <p className="mt-2 text-[15px] text-marigold-soft">
                    about {formatFiat(convertFromHeld(info?.balance ?? "0", php), "PHP")} for planning
                  </p>
                ) : null}
              </div>

              <div className="card p-6">
                <h2 className="text-[18px] font-bold text-ink">Add test funds instantly</h2>
                <p className="mt-1 text-[15px] leading-relaxed text-body">
                  Choose a practice amount to test safety nets, gifts, and claims. This action is available only on testnet.
                </p>
                <div className="mt-4 flex flex-wrap gap-2" aria-label="Choose test top-up amount">
                  {TOP_UP_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setTopUpAmount(amount)}
                      className={`rounded-full border px-4 py-2 text-[14px] font-semibold ${
                        topUpAmount === amount
                          ? "border-ink bg-ink text-paper"
                          : "border-line bg-white text-ink hover:bg-ink/5"
                      }`}
                    >
                      {amount.toLocaleString("en-PH")}
                    </button>
                  ))}
                </div>
                <div className="mt-4">
                  <Button loading={adding} onClick={addFunds}>Add {topUpAmount.toLocaleString("en-PH")} test funds</Button>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-[18px] font-bold text-ink">Receive to your address</h2>
              <p className="mt-1 text-[15px] text-body">Have someone send compatible testnet funds to the address below, or scan the code.</p>
              <div className="mt-5 flex flex-col items-center">
                {qr ? (
                  <DataUrlImage
                    src={qr}
                    alt="Your deposit address as a scannable code"
                    className="rounded-xl border border-line"
                  />
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
                  <Button size="md" variant="secondary" onClick={() => void copy()}>{copied ? "Copied" : "Copy"}</Button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 max-w-3xl">
            <CurrencyConverter
              defaultFrom={rates?.base ?? "PHP"}
              defaultTo="PHP"
              defaultAmount={info ? String(Number(info.balance)) : "1000"}
              title="What is this balance worth?"
              description="Estimate the value of your test balance or plan how much support to set aside in another currency."
            />
          </div>
        </>
      )}
    </AppShell>
  );
}