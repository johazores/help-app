"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { LoadErrorBanner } from "@/components/load-error-banner";
import { SafetyNetCard } from "@/components/safety-net-card";
import { BalanceCard } from "@/components/balance-card";
import { HomePageSkeleton } from "@/components/page-skeleton";
import { buttonClasses } from "@/components/ui/button";
import { authService } from "@/services/auth-service";
import { safetyNetService } from "@/services/safety-net-service";
import { ratesService } from "@/services/rates-service";
import { handleProtectedLoadError, loadErrorMessage } from "@/lib/api-errors";
import { countdown, windowProgress } from "@/lib/format";
import type { Profile, Rates, SafetyNet } from "@/services/types";

const REFRESH_AFTER_MS = 30_000;

/** Active safety nets past half their check-in window — needs a nudge. */
function urgentNets(nets: SafetyNet[]): SafetyNet[] {
  const now = Date.now();
  return nets.filter((net) => {
    if (net.status !== "ACTIVE" || net.kind === "GIFT") return false;
    if (Date.parse(net.unlockAt) <= now) return false;
    return windowProgress(net.lastCheckInAt, net.unlockAt) >= 0.5;
  });
}

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nets, setNets] = useState<SafetyNet[]>([]);
  const [rates, setRates] = useState<Rates | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState(false);
  const loadingRef = useRef(false);
  const lastLoadedAt = useRef(0);

  const load = useCallback(
    async ({ background = false }: { background?: boolean } = {}) => {
      if (loadingRef.current) return;

      loadingRef.current = true;
      if (!background) {
        setLoading(true);
        setLoadError(null);
      }

      // Peso estimates are optional: the dashboard never waits on, or fails with, the rate feed.
      ratesService.get().then(setRates).catch(() => {});

      try {
        const [p, n] = await Promise.all([authService.me(), safetyNetService.list()]);
        lastLoadedAt.current = Date.now();

        if (!p.hasWallet) {
          router.replace("/wallet-setup");
          return;
        }

        setProfile(p);
        setNets(n);
        setLoadError(null);
        setRefreshError(false);
      } catch (err) {
        if (handleProtectedLoadError(err, router, () => authService.signOut()) !== "error") return;
        // A failed background refresh keeps what's already on screen.
        if (background) setRefreshError(true);
        else setLoadError(loadErrorMessage(err));
      } finally {
        loadingRef.current = false;
        if (!background) setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    if (!authService.isSignedIn()) {
      router.replace("/sign-in");
      return;
    }
    void load();
  }, [router, load]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible" || !authService.isSignedIn()) return;
      if (Date.now() - lastLoadedAt.current < REFRESH_AFTER_MS) return;
      void load({ background: true });
    }

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const reminders = useMemo(() => urgentNets(nets), [nets]);
  const topReminder = reminders[0];

  if (loading && !profile && !loadError) {
    return (
      <AppShell>
        <HomePageSkeleton />
      </AppShell>
    );
  }

  const firstName = profile?.name.split(" ")[0] ?? "there";
  const hasFunds = Number(profile?.balance ?? 0) > 0;

  return (
    <AppShell>
      {loadError ? (
        <LoadErrorBanner message={loadError} onRetry={() => void load()} />
      ) : null}

      {refreshError && !loadError ? (
        <p className="mb-4 text-[14px] text-subtle" role="status">
          Couldn&rsquo;t refresh just now — showing what you saw last.{" "}
          <button type="button" className="min-h-11 font-semibold text-ink underline" onClick={() => void load({ background: true })}>
            Try again
          </button>
        </p>
      ) : null}

      {!loadError ? (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[16px] text-subtle">Kumusta,</p>
              <h1 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">{firstName}</h1>
            </div>
            {nets.length > 0 ? (
              <Link href="/home/new" className={`hidden sm:inline-flex ${buttonClasses({ size: "md" })}`}>
                Set aside money
              </Link>
            ) : null}
          </div>

          {topReminder ? (
            <Link
              href={`/home/${topReminder.id}`}
              className="mt-5 block rounded-2xl border-2 border-marigold/50 bg-marigold/10 p-5 transition-shadow hover:shadow-lift"
            >
              <p className="text-[17px] font-bold text-ink">
                Time to check in for {topReminder.forName}
              </p>
              <p className="mt-1 text-[15px] text-body">
                {topReminder.label} opens to your family in {countdown(topReminder.unlockAt).text}{" "}if you
                don&rsquo;t check in.
                {reminders.length > 1 ? ` (+${reminders.length - 1} more)` : ""}
              </p>
              <p className="mt-2 text-[15px] font-semibold text-ink">Check in now →</p>
            </Link>
          ) : null}

          <div className="mt-6">
            <BalanceCard balance={profile?.balance ?? "0"} rates={rates} />
          </div>

          {nets.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
              <h2 className="font-display text-[24px] font-bold text-ink">Start your first safety net</h2>
              <p className="mx-auto mt-2 max-w-md text-[17px] text-body">
                Set aside money for someone you love. It stays yours — and reaches them if you ever
                can&rsquo;t check in.
              </p>
              {hasFunds ? (
                <Link href="/home/new" className={`mt-6 ${buttonClasses()}`}>
                  Set aside money
                </Link>
              ) : (
                <>
                  <p className="mx-auto mt-4 max-w-md text-[15px] text-body">
                    First, add some funds to your wallet.
                  </p>
                  <Link href="/home/deposit" className={`mt-4 ${buttonClasses()}`}>
                    Add funds
                  </Link>
                </>
              )}
              <p className="mx-auto mt-6 max-w-md text-[15px] text-subtle">
                Or send a gift every month from{" "}
                <Link href="/home/tools/gift" className="font-semibold text-ink underline">
                  Family tools
                </Link>
                .
              </p>
            </div>
          ) : (
            <section aria-labelledby="nets-heading" className="mt-8">
              <h2 id="nets-heading" className="sr-only">Your safety nets</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {nets.map((net) => (
                  <SafetyNetCard key={net.id} net={net} />
                ))}
              </div>
            </section>
          )}

          {nets.length > 0 ? (
            <Link href="/home/new" className={`mt-6 sm:hidden ${buttonClasses({ fullWidth: true })}`}>
              Set aside money
            </Link>
          ) : null}
        </>
      ) : null}
    </AppShell>
  );
}
