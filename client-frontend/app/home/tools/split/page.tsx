"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { authService } from "@/services/auth-service";
import { recipientService } from "@/services/recipient-service";
import { safetyNetService } from "@/services/safety-net-service";
import { formatMoney } from "@/lib/format";
import type { Recipient } from "@/services/types";

const intervals = [
  { minutes: 1, label: "Every minute (testing)" },
  { minutes: 10080, label: "Every week" },
  { minutes: 43200, label: "Every month" },
  { minutes: 129600, label: "Every 3 months" },
];

export default function SplitPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [label, setLabel] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState(43200);
  const [shares, setShares] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!authService.isSignedIn()) {
      router.replace("/sign-in");
      return;
    }
    recipientService.list().then(setRecipients).finally(() => setReady(true));
  }, [router]);

  const chosen = recipients.filter((r) => Number(shares[r.id]) > 0);
  const total = chosen.reduce((sum, r) => sum + Number(shares[r.id]), 0);

  async function submit() {
    setError(null);
    if (label.trim().length < 2) return setError("Please give this a short name, like “Family fund”.");
    if (chosen.length < 2) return setError("Please enter amounts for at least two loved ones.");
    setSubmitting(true);
    try {
      for (let i = 0; i < chosen.length; i++) {
        setProgress(i);
        await safetyNetService.create({
          label: `${label.trim()} — ${chosen[i].name}`,
          amount: shares[chosen[i].id],
          recipientId: chosen[i].id,
          checkInIntervalMinutes: intervalMinutes,
        });
      }
      router.push("/home");
    } catch (err) {
      setError(
        (err instanceof Error ? err.message : "Something went wrong.") +
          (progress > 0 ? ` (${progress} of ${chosen.length} were set up — check your home screen.)` : ""),
      );
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <AppShell>
        <div className="flex justify-center py-20 text-ink"><Spinner className="h-7 w-7" /></div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link href="/home/tools" className="text-[15px] font-semibold text-subtle hover:text-ink">← Family tools</Link>
      <h1 className="mt-3 font-display text-[30px] font-bold text-ink sm:text-[36px]">Split a safety net</h1>
      <p className="mt-2 max-w-xl text-[16px] text-body">
        One plan, several loved ones. Each gets their own share and their own link. One check-in
        from you covers all of them at once — they simply share the same schedule.
      </p>

      <div className="mt-6 max-w-xl space-y-6">
        <Field label="Give it a short name">
          {(id) => <Input id={id} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Family fund" />}
        </Field>

        <div>
          <p className="field-label">How much for each person?</p>
          {recipients.length < 2 ? (
            <p className="hint">
              You need at least two loved ones for a split.{" "}
              <Link href="/home/people" className="font-semibold text-ink underline">Add loved ones</Link>
            </p>
          ) : (
            <div className="space-y-3">
              {recipients.map((r) => (
                <div key={r.id} className="flex items-center gap-3">
                  <span className="w-2/5 truncate text-[16px] font-semibold text-ink">{r.name}</span>
                  <Input
                    value={shares[r.id] ?? ""}
                    onChange={(e) => setShares((prev) => ({ ...prev, [r.id]: e.target.value.replace(/[^\d.]/g, "") }))}
                    placeholder="0"
                    inputMode="decimal"
                  />
                </div>
              ))}
            </div>
          )}
          {total > 0 ? <p className="mt-3 text-[15px] font-semibold text-ink">Total: {formatMoney(total)}</p> : null}
        </div>

        <div>
          <p className="field-label">How often will you check in?</p>
          <div className="grid grid-cols-2 gap-3">
            {intervals.map((i) => (
              <button
                key={i.minutes}
                onClick={() => setIntervalMinutes(i.minutes)}
                className={`rounded-xl border p-4 text-left text-[16px] font-semibold ${
                  intervalMinutes === i.minutes ? "border-ink bg-ink text-paper" : "border-line bg-white text-ink"
                }`}
              >
                {i.label}
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="text-[15px] font-medium text-danger" role="alert">{error}</p> : null}

        <Button fullWidth loading={submitting} onClick={submit} disabled={recipients.length < 2}>
          {submitting ? `Setting up ${progress + 1} of ${chosen.length}…` : `Set aside ${total > 0 ? formatMoney(total) : "money"}`}
        </Button>
      </div>
    </AppShell>
  );
}
