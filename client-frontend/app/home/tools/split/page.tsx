"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { ChoiceGrid } from "@/components/ui/choice-grid";
import { PageSpinner } from "@/components/ui/spinner";
import { LoadErrorBanner } from "@/components/load-error-banner";
import { authService } from "@/services/auth-service";
import { recipientService } from "@/services/recipient-service";
import { safetyNetService } from "@/services/safety-net-service";
import {
  handleProtectedLoadError,
  isUncertainOutcome,
  loadErrorMessage,
  UNCERTAIN_OUTCOME_HELP,
} from "@/lib/api-errors";
import { CHECK_IN_INTERVALS, decimalInput, formatMoney, intervalPhrase } from "@/lib/format";
import type { Recipient } from "@/services/types";

const intervalChoices = CHECK_IN_INTERVALS.map((i) => ({ value: i.minutes, label: i.label, note: i.note }));

export default function SplitPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [balance, setBalance] = useState(0);
  const [label, setLabel] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState(43200);
  const [shares, setShares] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const submittingRef = useRef(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [list, profile] = await Promise.all([recipientService.list(), authService.me()]);
      setRecipients(list);
      setBalance(Number(profile.balance) || 0);
    } catch (err) {
      if (handleProtectedLoadError(err, router, () => authService.signOut()) === "error") {
        setLoadError(loadErrorMessage(err));
      }
    } finally {
      setReady(true);
    }
  }, [router]);

  useEffect(() => {
    if (!authService.isSignedIn()) {
      router.replace("/sign-in");
      return;
    }
    void load();
  }, [router, load]);

  useEffect(() => {
    setReviewing(false);
  }, [label, intervalMinutes, shares]);

  const chosen = recipients.filter((r) => Number(shares[r.id]) > 0);
  const total = chosen.reduce((sum, r) => sum + Number(shares[r.id]), 0);

  function review() {
    setError(null);
    if (label.trim().length < 2) return setError("Please give this a short name, like “Family fund”.");
    if (chosen.length < 2) return setError("Please enter amounts for at least two loved ones.");
    if (total > balance) return setError("You don't have enough funds for this. Please add funds first.");
    setReviewing(true);
  }

  async function confirm() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await safetyNetService.createSplit({
        label: label.trim(),
        checkInIntervalMinutes: intervalMinutes,
        splits: chosen.map((r) => ({ recipientId: r.id, amount: shares[r.id] })),
      });
      router.push("/home");
    } catch (err) {
      setSubmitting(false);
      if (isUncertainOutcome(err)) {
        setUncertain(true);
        setError(`${loadErrorMessage(err)} ${UNCERTAIN_OUTCOME_HELP}`);
        return;
      }
      setError(loadErrorMessage(err));
      submittingRef.current = false;
    }
  }

  if (!ready) {
    return (
      <AppShell>
        <PageSpinner />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link href="/home/tools" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-subtle hover:text-ink">
        ← Family tools
      </Link>
      <h1 className="mt-1 font-display text-[30px] font-bold text-ink sm:text-[36px]">Split a safety net</h1>
      <p className="mt-2 max-w-xl text-[16px] text-body">
        One plan, several loved ones. Each gets their own share and their own link. One check-in
        schedule covers all of them — they open together if you stop checking in.
      </p>

      {loadError ? (
        <div className="mt-6 max-w-xl">
          <LoadErrorBanner message={loadError} onRetry={() => void load()} />
        </div>
      ) : null}

      <div className="mt-6 max-w-xl space-y-6">
        <Field label="Give it a short name">
          {(id, control) => (
            <Input id={id} {...control} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Family fund" maxLength={60} />
          )}
        </Field>

        <fieldset>
          <legend className="field-label">How much for each person?</legend>
          {!loadError && recipients.length < 2 ? (
            <p className="hint">
              You need at least two loved ones for a split.{" "}
              <Link href="/home/people" className="font-semibold text-ink underline">Add loved ones</Link>
            </p>
          ) : (
            <div className="space-y-3">
              {recipients.map((r) => (
                <div key={r.id} className="flex items-center gap-3">
                  <label htmlFor={`share-${r.id}`} className="w-2/5 truncate text-[16px] font-semibold text-ink">
                    {r.name}
                  </label>
                  <Input
                    id={`share-${r.id}`}
                    value={shares[r.id] ?? ""}
                    onChange={(e) => setShares((prev) => ({ ...prev, [r.id]: decimalInput(e.target.value) }))}
                    placeholder="0"
                    inputMode="decimal"
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-[15px] text-body" aria-live="polite">
            Total: <span className="font-semibold text-ink">{formatMoney(total)}</span> · You have{" "}
            {formatMoney(balance)} available
          </p>
        </fieldset>

        <section>
          <h2 className="field-label">How often will you check in?</h2>
          <ChoiceGrid
            label="How often will you check in?"
            choices={intervalChoices}
            value={intervalMinutes}
            onChange={setIntervalMinutes}
          />
        </section>

        {error ? <p className="text-[15px] font-medium text-danger" role="alert">{error}</p> : null}

        {!reviewing ? (
          <Button fullWidth onClick={review} disabled={recipients.length < 2}>
            Review
          </Button>
        ) : (
          <div className="card border-2 border-ink p-6">
            <h2 className="font-display text-[22px] font-bold text-ink">Please review</h2>
            <dl className="mt-4 space-y-3 text-[16px]">
              {chosen.map((r) => (
                <div key={r.id} className="flex items-baseline justify-between gap-4">
                  <dt className="text-subtle">For {r.name}</dt>
                  <dd className="font-semibold text-ink">{formatMoney(shares[r.id])}</dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-subtle">Opens to them</dt>
                <dd className="text-right font-semibold text-ink">if you don&rsquo;t check in {intervalPhrase(intervalMinutes)}</dd>
              </div>
              <div className="my-2 border-t border-line" />
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-subtle">Total</dt>
                <dd className="font-semibold text-ink">{formatMoney(total)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-subtle">Your funds after</dt>
                <dd className="text-ink">{formatMoney(balance - total)}</dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row-reverse">
              {uncertain ? (
                <Link href="/home" className={buttonClasses({ fullWidth: true })}>
                  Check my home screen
                </Link>
              ) : (
                <>
                  <Button fullWidth loading={submitting} onClick={confirm}>
                    Confirm &amp; set aside
                  </Button>
                  <Button fullWidth variant="ghost" disabled={submitting} onClick={() => setReviewing(false)}>
                    Go back
                  </Button>
                </>
              )}
            </div>
            <p className="mt-3 text-center text-[13px] text-subtle">
              All shares are set aside together in one step — either all of them or none.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
