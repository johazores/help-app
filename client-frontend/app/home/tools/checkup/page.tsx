"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LoadErrorBanner } from "@/components/load-error-banner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authService } from "@/services/auth-service";
import { configService } from "@/services/config-service";
import { recipientService } from "@/services/recipient-service";
import { safetyNetService } from "@/services/safety-net-service";
import { handleProtectedLoadError, loadErrorMessage } from "@/lib/api-errors";
import type { AppConfig, Profile, Recipient, SafetyNet } from "@/services/types";

type ReadinessStep = {
  title: string;
  body: string;
  href: string;
  action: string;
  done: boolean;
};

export default function FamilyReadinessCheckupPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [nets, setNets] = useState<SafetyNet[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [nextProfile, nextRecipients, nextNets, nextConfig] = await Promise.all([
        authService.me(),
        recipientService.list(),
        safetyNetService.list(),
        configService.get(),
      ]);
      setProfile(nextProfile);
      setRecipients(nextRecipients);
      setNets(nextNets);
      setConfig(nextConfig);
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
  }, [load, router]);

  const steps = useMemo<ReadinessStep[]>(() => {
    const coreNet = nets.find((net) => net.kind !== "GIFT" && net.status !== "CLOSED");
    const backupNet = nets.find((net) => Boolean(net.backupName) && net.status !== "CLOSED");
    return [
      {
        title: "Verify a recovery email",
        body: "A verified email helps you recover access and receive important account notices.",
        href: "/home/account",
        action: "Verify email",
        done: Boolean(profile?.emailVerified),
      },
      {
        title: "Add at least one loved one",
        body: "Use a real name and keep their phone number current so future verification is possible.",
        href: "/home/people",
        action: "Add loved one",
        done: recipients.length > 0,
      },
      {
        title: "Create one core safety net",
        body: "Start with one simple plan before using gifts, tuition schedules, or group savings.",
        href: coreNet ? `/home/${coreNet.id}` : "/home/new",
        action: coreNet ? "Review safety net" : "Create safety net",
        done: Boolean(coreNet),
      },
      {
        title: "Add a backup recipient",
        body: "A second trusted person reduces the chance that one unavailable recipient blocks the family plan.",
        href: backupNet ? `/home/${backupNet.id}` : "/home/new",
        action: backupNet ? "Review backup plan" : "Create a plan with backup",
        done: Boolean(backupNet),
      },
    ];
  }, [nets, profile?.emailVerified, recipients.length]);

  const completed = steps.filter((step) => step.done).length;
  const percentage = Math.round((completed / steps.length) * 100);
  const nextStep = steps.find((step) => !step.done);
  const isTestnet = !config || config.network.toLowerCase() !== "public";

  if (loading && !profile) {
    return (
      <AppShell>
        <div className="flex justify-center py-20 text-ink"><Spinner className="h-7 w-7" /></div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {loadError ? <LoadErrorBanner message={loadError} onRetry={() => void load()} /> : null}
      {!loadError ? (
        <div className="max-w-3xl">
          <Link href="/home/tools" className="text-[15px] font-semibold text-subtle hover:text-ink">← Family tools</Link>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">Family readiness checkup</h1>
              <p className="mt-2 max-w-xl text-[17px] text-body">Complete the essentials before experimenting with more advanced family tools.</p>
            </div>
            <p className="text-[15px] font-bold text-ink">{completed} of {steps.length} ready</p>
          </div>

          <div className="mt-6 rounded-2xl bg-ink p-6 text-paper">
            <div className="flex items-center justify-between gap-4">
              <p className="font-display text-[23px] font-bold">{percentage}% prepared</p>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-bold uppercase tracking-wide">{isTestnet ? "Testnet" : config?.network}</span>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-marigold transition-all" style={{ width: `${percentage}%` }} />
            </div>
            {nextStep ? (
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[15px] text-paper/80">Recommended next: <strong className="text-paper">{nextStep.title}</strong></p>
                <Link href={nextStep.href}><Button size="md" variant="secondary">{nextStep.action}</Button></Link>
              </div>
            ) : (
              <p className="mt-5 text-[15px] text-paper/80">Your basic setup is complete. Review it regularly and privately share claim instructions with your family.</p>
            )}
          </div>

          {isTestnet ? (
            <div className="mt-5 rounded-2xl border border-marigold/50 bg-marigold/10 p-5 text-[15px] leading-relaxed text-body">
              This checkup measures setup readiness only. The current environment uses fictional testnet value and is not real financial protection.
              <Link href="/home/trust" className="ml-1 font-semibold text-ink underline">Review the limitations.</Link>
            </div>
          ) : null}

          <div className="mt-6 space-y-4">
            {steps.map((step, index) => (
              <div key={step.title} className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-4">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[16px] font-bold ${step.done ? "bg-sage/20 text-ink" : "bg-ink/5 text-subtle"}`}>
                    {step.done ? "✓" : index + 1}
                  </span>
                  <div>
                    <h2 className="text-[18px] font-bold text-ink">{step.title}</h2>
                    <p className="mt-1 text-[15px] leading-relaxed text-body">{step.body}</p>
                  </div>
                </div>
                <Link href={step.href} className="shrink-0 text-[15px] font-semibold text-ink underline">{step.done ? "Review" : step.action}</Link>
              </div>
            ))}
          </div>

          <section className="mt-8 rounded-2xl border border-line bg-white p-6">
            <h2 className="text-[20px] font-bold text-ink">After the basics</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-body">Choose one tool based on a real family need. Avoid setting up several plans that nobody understands.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <QuickLink href="/home/tools/gift" title="Planned gift" body="For birthdays, graduation, or scheduled support." />
              <QuickLink href="/home/tools/gift?mode=parts" title="Tuition schedule" body="For support that opens term by term." />
              <QuickLink href="/home/tools/split" title="Several dependants" body="For dividing one plan across multiple loved ones." />
              <QuickLink href="/home/paluwagan" title="Trusted savings circle" body="For groups that already know and trust each other." />
            </div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

function QuickLink({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="rounded-xl border border-line bg-paper p-4 hover:bg-ink/5">
      <p className="text-[16px] font-bold text-ink">{title}</p>
      <p className="mt-1 text-[14px] text-body">{body}</p>
    </Link>
  );
}
