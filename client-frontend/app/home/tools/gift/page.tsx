"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { decimalInput, formatDate, formatMoney } from "@/lib/format";
import type { Recipient } from "@/services/types";

type Mode = "now" | "date" | "parts";
type Part = { amount: string; date: string };

const MODES: { value: Mode; label: string }[] = [
  { value: "now", label: "Send now" },
  { value: "date", label: "On a date" },
  { value: "parts", label: "In parts" },
];

/** 08:00 local time on the chosen day, so a gift opens in the morning. */
function opensAtIso(date: string): string {
  return new Date(`${date}T08:00:00`).toISOString();
}

function GiftForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [mode, setMode] = useState<Mode>(search?.get("mode") === "parts" ? "parts" : "now");
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [balance, setBalance] = useState(0);
  const [recipientId, setRecipientId] = useState("");
  // Savings goals link here with the goal's name and amount filled in.
  const [label, setLabel] = useState(search?.get("label")?.slice(0, 60) ?? "");
  const [amount, setAmount] = useState(decimalInput(search?.get("amount") ?? ""));
  const [openDate, setOpenDate] = useState("");
  const [parts, setParts] = useState<Part[]>([
    { amount: "", date: "" },
    { amount: "", date: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Set when the server couldn't say whether the last part moved; the plan is
  // then locked so that part can never be sent twice.
  const [uncertain, setUncertain] = useState(false);
  // Parts already set aside in this plan. A retry after a failure skips them,
  // so no part is ever created twice.
  const [createdParts, setCreatedParts] = useState(0);
  const submittingRef = useRef(false);
  const today = new Date().toISOString().slice(0, 10);
  const planStarted = createdParts > 0;

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [list, profile] = await Promise.all([recipientService.list(), authService.me()]);
      setRecipients(list);
      setRecipientId((current) => current || list[0]?.id || "");
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
    if (!planStarted) setReviewing(false);
  }, [mode, recipientId, label, amount, openDate, parts, planStarted]);

  const filledParts = parts.filter((p) => Number(p.amount) > 0 && p.date);
  const total =
    mode === "parts" ? filledParts.reduce((sum, p) => sum + Number(p.amount), 0) : Number(amount) || 0;
  const recipientName = recipients.find((r) => r.id === recipientId)?.name ?? "them";

  function validate(): string | null {
    if (!recipientId) return "Please choose who this is for.";
    if (label.trim().length < 2) return "Please give it a short name, like “Birthday gift”.";
    if (mode === "parts") {
      if (filledParts.length === 0) return "Please add at least one part with an amount and a date.";
      if (filledParts.length !== parts.filter((p) => p.amount || p.date).length) {
        return "Each part needs both an amount and a date.";
      }
    } else {
      if (!(Number(amount) > 0)) return "Please enter an amount.";
      if (mode === "date" && !openDate) return "Please choose the date it opens.";
    }
    if (!planStarted && total > balance) return "You don't have enough funds for this. Please add funds first.";
    return null;
  }

  function review() {
    const problem = validate();
    setError(problem);
    if (!problem) setReviewing(true);
  }

  async function confirm() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "parts") {
        for (let i = createdParts; i < filledParts.length; i++) {
          await safetyNetService.create({
            label: `${label.trim()} (${i + 1} of ${filledParts.length})`,
            amount: filledParts[i].amount,
            recipientId,
            kind: "GIFT",
            opensAt: opensAtIso(filledParts[i].date),
          });
          setCreatedParts(i + 1);
        }
        router.push("/home");
      } else {
        const net = await safetyNetService.create({
          label: label.trim(),
          amount,
          recipientId,
          kind: "GIFT",
          opensAt: mode === "date" ? opensAtIso(openDate) : undefined,
        });
        router.push(`/home/${net.id}?created=1`);
      }
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

  if (!ready) return <PageSpinner />;

  return (
    <>
      <Link href="/home/tools" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-subtle hover:text-ink">
        ← Family tools
      </Link>
      <h1 className="mt-1 font-display text-[30px] font-bold text-ink sm:text-[36px]">
        {mode === "parts" ? "Tuition plan" : "Send a gift"}
      </h1>
      <p className="mt-2 max-w-xl text-[16px] text-body">
        {mode === "parts"
          ? "Set aside school money that opens term by term, on the dates you choose. No check-ins — each part is theirs the moment its date arrives."
          : "No check-ins here — a gift is theirs the moment it opens. They receive it with the same easy link."}
      </p>

      {loadError ? (
        <div className="mt-6 max-w-xl">
          <LoadErrorBanner message={loadError} onRetry={() => void load()} />
        </div>
      ) : null}

      <fieldset disabled={planStarted || submitting} className="mt-6 max-w-xl space-y-5">
        <ChoiceGrid label="How to send it" columns={3} compact choices={MODES} value={mode} onChange={setMode} />

        <Field label="Who is it for?">
          {(id, control) => (
            <select
              id={id}
              {...control}
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="h-14 w-full rounded-xl border border-line bg-white px-4 text-[17px] text-ink focus:border-ink"
            >
              {recipients.map((r) => (
                <option key={r.id} value={r.id}>{r.name} — {r.relationship}</option>
              ))}
            </select>
          )}
        </Field>
        {!loadError && recipients.length === 0 ? (
          <p className="hint">
            You haven&rsquo;t added anyone yet.{" "}
            <Link href="/home/people" className="font-semibold text-ink underline">Add a loved one</Link> first.
          </p>
        ) : null}

        <Field label="Give it a short name">
          {(id, control) => (
            <Input
              id={id}
              {...control}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={mode === "parts" ? "School year 2026" : "Happy birthday, Nanay"}
              maxLength={60}
            />
          )}
        </Field>

        {mode !== "parts" ? (
          <Field label="How much?" hint={`You have ${formatMoney(balance)} available.`}>
            {(id, control) => (
              <Input
                id={id}
                {...control}
                value={amount}
                onChange={(e) => setAmount(decimalInput(e.target.value))}
                placeholder="50"
                inputMode="decimal"
                autoComplete="off"
              />
            )}
          </Field>
        ) : null}

        {mode === "date" ? (
          <Field label="When should it open?" hint="They'll see it's waiting, and it opens on this day.">
            {(id, control) => (
              <Input id={id} {...control} type="date" value={openDate} onChange={(e) => setOpenDate(e.target.value)} min={today} />
            )}
          </Field>
        ) : null}

        {mode === "parts" ? (
          <fieldset className="space-y-3">
            <legend className="field-label">The parts</legend>
            {parts.map((part, i) => (
              <div key={i} className="flex gap-3">
                <Input
                  aria-label={`Amount for part ${i + 1}`}
                  value={part.amount}
                  onChange={(e) =>
                    setParts((prev) => prev.map((x, j) => (j === i ? { ...x, amount: decimalInput(e.target.value) } : x)))
                  }
                  placeholder="Amount"
                  inputMode="decimal"
                />
                <Input
                  aria-label={`Opening date for part ${i + 1}`}
                  type="date"
                  value={part.date}
                  onChange={(e) => setParts((prev) => prev.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))}
                  min={today}
                />
              </div>
            ))}
            {parts.length < 6 ? (
              <button
                type="button"
                onClick={() => setParts((p) => [...p, { amount: "", date: "" }])}
                className="min-h-11 text-[15px] font-semibold text-ink underline"
              >
                + Add another part
              </button>
            ) : null}
            <p className="hint">Each part opens to them on its date — perfect for tuition per term.</p>
          </fieldset>
        ) : null}
      </fieldset>

      <div className="mt-5 max-w-xl space-y-4">
        {error ? (
          <p className="text-[15px] font-medium text-danger" role="alert">
            {uncertain
              ? `${createdParts} of ${filledParts.length} parts are confirmed. ${error}`
              : planStarted
              ? `${createdParts} of ${filledParts.length} parts are set aside. ${error} Tap “Finish the plan” to set aside the rest — parts already done won't be repeated.`
              : error}
          </p>
        ) : null}

        {!reviewing ? (
          <Button fullWidth onClick={review} disabled={recipients.length === 0}>
            Review
          </Button>
        ) : (
          <div className="card border-2 border-ink p-6">
            <h2 className="font-display text-[22px] font-bold text-ink">Please review</h2>
            <dl className="mt-4 space-y-3 text-[16px]">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-subtle">For</dt>
                <dd className="text-right font-semibold text-ink">{recipientName}</dd>
              </div>
              {mode === "parts" ? (
                filledParts.map((p, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-4">
                    <dt className="text-subtle">
                      Part {i + 1} · opens {formatDate(opensAtIso(p.date))}
                      {i < createdParts ? " · done" : ""}
                    </dt>
                    <dd className="font-semibold text-ink">{formatMoney(p.amount)}</dd>
                  </div>
                ))
              ) : (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-subtle">Opens</dt>
                  <dd className="text-right font-semibold text-ink">
                    {mode === "now" ? "Right away" : formatDate(opensAtIso(openDate))}
                  </dd>
                </div>
              )}
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
            <p className="mt-4 text-[14px] text-subtle">
              {mode === "now"
                ? `${recipientName} can receive this as soon as you confirm. Gifts can't be taken back once received.`
                : "You can take a gift back any time before it's received."}
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row-reverse">
              {uncertain ? (
                <Link href="/home" className={buttonClasses({ fullWidth: true })}>
                  Check my home screen
                </Link>
              ) : (
                <Button fullWidth loading={submitting} onClick={confirm}>
                  {planStarted
                    ? "Finish the plan"
                    : submitting && mode === "parts"
                    ? `Setting aside part ${createdParts + 1}…`
                    : mode === "now"
                    ? `Send ${formatMoney(total)} now`
                    : "Confirm"}
                </Button>
              )}
              {!planStarted && !uncertain ? (
                <Button fullWidth variant="ghost" disabled={submitting} onClick={() => setReviewing(false)}>
                  Go back
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function GiftPage() {
  return (
    <AppShell>
      <Suspense fallback={<PageSpinner />}>
        <GiftForm />
      </Suspense>
    </AppShell>
  );
}
