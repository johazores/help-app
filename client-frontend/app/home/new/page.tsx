"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { PageSpinner } from "@/components/ui/spinner";
import { ChoiceGrid } from "@/components/ui/choice-grid";
import { RecipientForm, RecipientPicker } from "@/components/recipient-form";
import { LoadErrorBanner } from "@/components/load-error-banner";
import { authService } from "@/services/auth-service";
import { recipientService } from "@/services/recipient-service";
import { safetyNetService } from "@/services/safety-net-service";
import { ratesService } from "@/services/rates-service";
import { handleProtectedLoadError, loadErrorMessage } from "@/lib/api-errors";
import {
  CHECK_IN_INTERVALS,
  convertFromHeld,
  decimalInput,
  formatFiat,
  formatMoney,
  intervalPhrase,
} from "@/lib/format";
import type { Recipient } from "@/services/types";

const MIN_AMOUNT = 1;
const intervalChoices = CHECK_IN_INTERVALS.map((i) => ({ value: i.minutes, label: i.label, note: i.note }));

export default function NewSafetyNetPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  const [recipientId, setRecipientId] = useState<string>("");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState(43200);
  const [useBackup, setUseBackup] = useState(false);
  const [backupRecipientId, setBackupRecipientId] = useState("");
  const [receiverIntervalMinutes, setReceiverIntervalMinutes] = useState(43200);
  const [addingNew, setAddingNew] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [balance, setBalance] = useState<string>("0");
  const [phpRate, setPhpRate] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const submitted = useRef(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [list, profile] = await Promise.all([recipientService.list(), authService.me()]);
      setRecipients(list);
      setRecipientId((current) => current || list[0]?.id || "");
      setAddingNew(list.length === 0);
      setBalance(profile.balance);
    } catch (err) {
      if (handleProtectedLoadError(err, router, () => authService.signOut()) !== "error") return;
      setLoadError(loadErrorMessage(err));
    } finally {
      setReady(true);
    }
    // Estimates are a convenience: the form still works if rates are unavailable.
    ratesService
      .get()
      .then((rates) => setPhpRate(rates.rates.PHP ?? null))
      .catch(() => setPhpRate(null));
  }, [router]);

  useEffect(() => {
    if (!authService.isSignedIn()) {
      router.replace("/sign-in");
      return;
    }
    void load();
    const preset = new URLSearchParams(window.location.search).get("preset");
    if (preset === "abuloy") {
      setLabel("Abuloy fund");
      setIntervalMinutes(43200);
    }
  }, [router, load]);

  // Any change after Review sends the person back to review the new details.
  useEffect(() => {
    setReviewing(false);
  }, [recipientId, label, amount, intervalMinutes, useBackup, backupRecipientId, receiverIntervalMinutes]);

  // The backup must always be someone other than the main receiver.
  useEffect(() => {
    if (backupRecipientId && backupRecipientId === recipientId) {
      setBackupRecipientId(recipients.find((r) => r.id !== recipientId)?.id ?? "");
    }
  }, [recipientId, backupRecipientId, recipients]);

  function validate(): string | null {
    if (!recipientId) return "Please choose who this is for.";
    if (label.trim().length < 2) return "Please give this a short name, like “Monthly support”.";
    const value = Number(amount);
    if (!(value >= MIN_AMOUNT)) return `Please enter an amount of at least ${MIN_AMOUNT}.`;
    if (value > Number(balance)) return "You don't have enough funds for this. Please add funds first.";
    if (useBackup && !backupRecipientId) {
      return "Please choose a backup person, or turn off the backup option.";
    }
    if (useBackup && backupRecipientId === recipientId) {
      return "Please choose someone different as the backup.";
    }
    return null;
  }

  function review() {
    const problem = validate();
    setError(problem);
    if (!problem) setReviewing(true);
  }

  async function confirm() {
    if (submitted.current) return;
    const problem = validate();
    if (problem) {
      setError(problem);
      setReviewing(false);
      return;
    }
    submitted.current = true;
    setError(null);
    setSubmitting(true);
    try {
      const net = await safetyNetService.create({
        label: label.trim(),
        amount,
        recipientId,
        checkInIntervalMinutes: intervalMinutes,
        backupRecipientId: useBackup ? backupRecipientId : undefined,
        postReceiptCheckInIntervalMinutes: useBackup ? receiverIntervalMinutes : undefined,
      });
      router.push(`/home/${net.id}?created=1`);
    } catch (err) {
      submitted.current = false;
      setError(loadErrorMessage(err));
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <AppShell>
        <PageSpinner />
      </AppShell>
    );
  }

  const amt = Number(amount) || 0;
  const recipientName = recipients.find((r) => r.id === recipientId)?.name ?? "your loved one";
  const backupName = recipients.find((r) => r.id === backupRecipientId)?.name ?? "your backup";
  const backupChoices = recipients.filter((r) => r.id !== recipientId);
  const balanceNum = Number(balance) || 0;
  const balanceAfter = balanceNum - amt;
  const peso = (v: number) => (phpRate !== null ? `≈ ${formatFiat(convertFromHeld(v, phpRate), "PHP")}` : "");

  return (
    <AppShell>
      {loadError ? <LoadErrorBanner message={loadError} onRetry={() => void load()} /> : null}
      <Link href="/home" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-subtle hover:text-ink">
        ← Back
      </Link>
      <h1 className="mt-1 font-display text-[30px] font-bold text-ink sm:text-[36px]">
        Set aside money
      </h1>

      {!loadError && balanceNum <= 0 ? (
        <div className="mt-6 max-w-xl rounded-xl border border-marigold/50 bg-marigold/10 px-5 py-4 text-[15px] text-body">
          <p className="font-semibold text-ink">Your wallet is empty right now.</p>
          <p className="mt-1">
            Add funds first, then come back to set money aside.{" "}
            <Link href="/home/deposit" className="font-semibold text-ink underline">
              Add funds
            </Link>
          </p>
        </div>
      ) : null}

      <div className="mt-8 max-w-xl space-y-8">
        <section aria-labelledby="who-heading">
          <h2 id="who-heading" className="text-[19px] font-bold text-ink">Who is this for?</h2>
          <div className="mt-4">
            <RecipientPicker
              name="recipient"
              legend="Who is this for?"
              recipients={recipients}
              value={recipientId}
              onChange={setRecipientId}
            />
          </div>

          {addingNew ? (
            <div className="mt-4">
              <RecipientForm
                onSaved={(created) => {
                  setRecipients((prev) => [...prev, created]);
                  setRecipientId(created.id);
                  setAddingNew(false);
                }}
                onCancel={recipients.length > 0 ? () => setAddingNew(false) : undefined}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingNew(true)}
              className="mt-3 min-h-11 text-[16px] font-semibold text-ink underline"
            >
              + Add someone new
            </button>
          )}
        </section>

        <section className="space-y-5" aria-labelledby="details-heading">
          <h2 id="details-heading" className="text-[19px] font-bold text-ink">The details</h2>
          <Field label="Give it a short name" hint="Something you'll recognize, like “Monthly support”.">
            {(id, control) => (
              <Input id={id} {...control} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Monthly support" maxLength={60} />
            )}
          </Field>
          <Field
            label="How much do you want to set aside?"
            hint={`You have ${formatMoney(balanceNum)} available${phpRate !== null ? ` (${peso(balanceNum)})` : ""}.`}
          >
            {(id, control) => (
              <Input
                id={id}
                {...control}
                value={amount}
                onChange={(e) => setAmount(decimalInput(e.target.value))}
                placeholder="100"
                inputMode="decimal"
                autoComplete="off"
              />
            )}
          </Field>
          {amt > 0 && phpRate !== null ? (
            <p className="hint" aria-live="polite">{peso(amt)}{" "}at today&rsquo;s rate</p>
          ) : null}
        </section>

        <section aria-labelledby="interval-heading">
          <h2 id="interval-heading" className="text-[19px] font-bold text-ink">How often will you check in?</h2>
          <p className="mt-1 hint">
            If you don&rsquo;t check in within this time, the money opens to your family.
          </p>
          <div className="mt-4">
            <ChoiceGrid
              label="How often will you check in?"
              choices={intervalChoices}
              value={intervalMinutes}
              onChange={setIntervalMinutes}
            />
          </div>
        </section>

        <section aria-labelledby="backup-heading">
          <h2 id="backup-heading" className="text-[19px] font-bold text-ink">A backup person (optional)</h2>
          <p className="mt-1 hint">
            After {recipientName} receives this money, Sagip can keep protecting it. Name someone else —
            a sibling, spouse, or child — who receives it if {recipientName} can no longer check in,
            including if they pass away.
          </p>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white p-4">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-[#0C3B3A]"
              checked={useBackup}
              onChange={(e) => {
                setUseBackup(e.target.checked);
                if (e.target.checked && !backupRecipientId && backupChoices[0]) {
                  setBackupRecipientId(backupChoices[0].id);
                }
              }}
            />
            <span>
              <span className="block text-[17px] font-semibold text-ink">Add a backup person</span>
              <span className="block text-[15px] text-subtle">
                If {recipientName}{" "}can&rsquo;t check in after receiving, this person receives next.
              </span>
            </span>
          </label>

          {useBackup ? (
            <div className="mt-4 space-y-4 rounded-xl border border-line bg-white p-5">
              {backupChoices.length === 0 ? (
                <p className="text-[15px] text-body">
                  Add another loved one first — the backup must be someone different from {recipientName}.
                </p>
              ) : (
                <>
                  <RecipientPicker
                    name="backup"
                    legend="Backup person"
                    recipients={backupChoices}
                    value={backupRecipientId}
                    onChange={setBackupRecipientId}
                  />
                  <div>
                    <p className="text-[15px] font-semibold text-ink">
                      How often should {recipientName} check in after receiving?
                    </p>
                    <p className="mt-1 text-[14px] text-subtle">
                      If they don&rsquo;t, {backupName} can receive the money.
                    </p>
                    <div className="mt-3">
                      <ChoiceGrid
                        compact
                        label={`How often should ${recipientName} check in after receiving?`}
                        choices={intervalChoices.map(({ value, label: text }) => ({ value, label: text }))}
                        value={receiverIntervalMinutes}
                        onChange={setReceiverIntervalMinutes}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : backupChoices.length > 0 ? (
            <p className="mt-3 text-[14px] leading-relaxed text-subtle">
              Without a backup, if {recipientName} receives this and later passes away, the money stays
              in their account with no automatic next step.
            </p>
          ) : null}
        </section>

        {error ? (
          <p className="text-[15px] font-medium text-danger" role="alert">
            {error}
          </p>
        ) : null}

        {!reviewing ? (
          <Button fullWidth onClick={review} disabled={recipients.length === 0}>
            Review
          </Button>
        ) : (
          <div className="card border-2 border-ink p-6" aria-labelledby="review-heading">
            <h2 id="review-heading" className="font-display text-[22px] font-bold text-ink">Please review</h2>
            <p className="mt-1 text-[15px] text-body">Check the details before you confirm.</p>

            <dl className="mt-5 space-y-3 text-[16px]">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-subtle">Amount to set aside</dt>
                <dd className="text-right font-semibold text-ink">
                  {formatMoney(amt)}
                  {phpRate !== null ? <span className="block text-[13px] font-normal text-subtle">{peso(amt)}</span> : null}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-subtle">For</dt>
                <dd className="text-right font-semibold text-ink">{recipientName}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-subtle">Opens to family</dt>
                <dd className="text-right font-semibold text-ink">if you don&rsquo;t check in {intervalPhrase(intervalMinutes)}</dd>
              </div>
              {useBackup && backupRecipientId ? (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-subtle">If {recipientName}{" "}can&rsquo;t check in after receiving</dt>
                  <dd className="text-right font-semibold text-ink">
                    goes to {backupName}
                    <span className="block text-[13px] font-normal text-subtle">
                      after {intervalPhrase(receiverIntervalMinutes)} without a check-in
                    </span>
                  </dd>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-subtle">Fee</dt>
                <dd className="font-semibold text-ink">None</dd>
              </div>

              <div className="my-2 border-t border-line" />

              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-subtle">Your funds now</dt>
                <dd className="text-ink">{formatMoney(balanceNum)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-subtle">After setting aside</dt>
                <dd className="font-semibold text-ink">{formatMoney(balanceAfter)}</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
              <Button fullWidth loading={submitting} onClick={confirm}>
                Confirm &amp; set aside
              </Button>
              <Button fullWidth variant="ghost" onClick={() => setReviewing(false)} disabled={submitting}>
                Go back
              </Button>
            </div>
            <p className="mt-3 text-center text-[13px] text-subtle">
              You can take this money back at any time while it&rsquo;s still yours.
            </p>
            <p className="mt-2 rounded-xl bg-sage/10 px-4 py-3 text-center text-[13px] leading-relaxed text-body">
              When you confirm, who can receive this and from when is recorded on a public network
              that anyone can check. Your receipt links to that record.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
