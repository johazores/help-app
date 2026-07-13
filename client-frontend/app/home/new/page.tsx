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
import { ratesService } from "@/services/rates-service";
import {
  convertFromXlm,
  formatFiat,
  formatMoney,
  NETWORK_FEE_XLM,
} from "@/lib/format";
import type { Recipient } from "@/services/types";

const MIN_AMOUNT = 1;

function intervalLabel(minutes: number): string {
  const found = [
    { minutes: 1, label: "every minute" },
    { minutes: 10080, label: "every week" },
    { minutes: 43200, label: "every month" },
    { minutes: 129600, label: "every 3 months" },
  ].find((i) => i.minutes === minutes);
  return found?.label ?? "on schedule";
}

const intervals = [
  { minutes: 1, label: "Every minute", note: "For trying it out" },
  { minutes: 10080, label: "Every week" },
  { minutes: 43200, label: "Every month" },
  { minutes: 129600, label: "Every 3 months" },
];

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
  const [newName, setNewName] = useState("");
  const [newRelationship, setNewRelationship] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [savingRecipient, setSavingRecipient] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [balance, setBalance] = useState<string>("0");
  const [phpRate, setPhpRate] = useState<number | null>(null);

  useEffect(() => {
    if (!authService.isSignedIn()) {
      router.replace("/sign-in");
      return;
    }
    Promise.all([recipientService.list(), authService.me(), ratesService.get()])
      .then(([list, profile, rates]) => {
        setRecipients(list);
        setRecipientId(list[0]?.id ?? "");
        setAddingNew(list.length === 0);
        setBalance(profile.balance);
        setPhpRate(rates.rates.PHP ?? null);
      })
      .catch(() => authService.signOut())
      .finally(() => setReady(true));
    if (typeof window !== "undefined") {
      const preset = new URLSearchParams(window.location.search).get("preset");
      if (preset === "abuloy") {
        setLabel("Abuloy fund");
        setIntervalMinutes(43200);
      }
    }
  }, [router]);

  async function saveRecipient() {
    setError(null);
    if (newName.trim().length < 2 || newRelationship.trim().length < 2) {
      setError("Please enter their name and how they're related to you.");
      return;
    }
    setSavingRecipient(true);
    try {
      const created = await recipientService.create({
        name: newName,
        relationship: newRelationship,
        phone: newPhone || undefined,
      });
      setRecipients((prev) => [...prev, created]);
      setRecipientId(created.id);
      setAddingNew(false);
      setNewName("");
      setNewRelationship("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that person.");
    } finally {
      setSavingRecipient(false);
    }
  }

  function review() {
    setError(null);
    if (!recipientId) {
      setError("Please choose who this is for.");
      return;
    }
    if (label.trim().length < 2) {
      setError("Please give this a short name, like “Monthly support”.");
      return;
    }
    const value = Number(amount);
    if (!(value >= MIN_AMOUNT)) {
      setError(`Please enter an amount of at least ${MIN_AMOUNT}.`);
      return;
    }
    if (value > Number(balance)) {
      setError("You don't have enough funds for this. Please add funds first.");
      return;
    }
    if (useBackup && !backupRecipientId) {
      setError("Please choose a backup person, or turn off the backup option.");
      return;
    }
    setReviewing(true);
  }

  async function confirm() {
    setError(null);
    setSubmitting(true);
    try {
      const net = await safetyNetService.create({
        label,
        amount,
        recipientId,
        checkInIntervalMinutes: intervalMinutes,
        backupRecipientId: useBackup ? backupRecipientId : undefined,
        postReceiptCheckInIntervalMinutes: useBackup ? receiverIntervalMinutes : undefined,
      });
      router.push(`/home/${net.id}?created=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't set this up.");
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <AppShell>
        <div className="flex justify-center py-20 text-ink">
          <Spinner className="h-7 w-7" />
        </div>
      </AppShell>
    );
  }

  const amt = Number(amount) || 0;
  const recipientName = recipients.find((r) => r.id === recipientId)?.name ?? "your loved one";
  const backupName = recipients.find((r) => r.id === backupRecipientId)?.name ?? "your backup";
  const backupChoices = recipients.filter((r) => r.id !== recipientId);
  const balanceNum = Number(balance) || 0;
  const balanceAfter = balanceNum - amt;
  const peso = (v: number) => (phpRate !== null ? `≈ ${formatFiat(convertFromXlm(v, phpRate), "PHP")}` : "");

  return (
    <AppShell>
      <Link href="/home" className="text-[15px] font-semibold text-subtle hover:text-ink">
        ← Back
      </Link>
      <h1 className="mt-3 font-display text-[30px] font-bold text-ink sm:text-[36px]">
        Set aside money
      </h1>

      <div className="mt-8 max-w-xl space-y-8">
        {/* Who is it for */}
        <section>
          <h2 className="text-[19px] font-bold text-ink">Who is this for?</h2>
          <div className="mt-4 space-y-3">
            {recipients.map((r) => (
              <label
                key={r.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${
                  recipientId === r.id ? "border-ink bg-ink/5" : "border-line bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="recipient"
                  className="h-5 w-5 accent-[#0C3B3A]"
                  checked={recipientId === r.id}
                  onChange={() => setRecipientId(r.id)}
                />
                <span>
                  <span className="block text-[17px] font-semibold text-ink">{r.name}</span>
                  <span className="block text-[15px] text-subtle">{r.relationship}</span>
                </span>
              </label>
            ))}
          </div>

          {addingNew ? (
            <div className="mt-4 rounded-xl border border-line bg-white p-5">
              <div className="space-y-4">
                <Field label="Their name">
                  {(id) => (
                    <Input id={id} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Elena dela Cruz" />
                  )}
                </Field>
                <Field label="How are they related to you?">
                  {(id) => (
                    <Input
                      id={id}
                      value={newRelationship}
                      onChange={(e) => setNewRelationship(e.target.value)}
                      placeholder="Mother"
                    />
                  )}
                </Field>
                <Field label="Their mobile number (optional)" hint="So they can find their link again if they lose their phone.">
                  {(id) => (
                    <Input
                      id={id}
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="09XX XXX XXXX"
                      inputMode="tel"
                    />
                  )}
                </Field>
                <div className="flex gap-3">
                  <Button size="md" loading={savingRecipient} onClick={saveRecipient}>
                    Save
                  </Button>
                  {recipients.length > 0 ? (
                    <Button size="md" variant="ghost" onClick={() => setAddingNew(false)}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingNew(true)}
              className="mt-4 text-[16px] font-semibold text-ink underline"
            >
              + Add someone new
            </button>
          )}
        </section>

        {/* Details */}
        <section className="space-y-5">
          <h2 className="text-[19px] font-bold text-ink">The details</h2>
          <Field label="Give it a short name" hint="Something you'll recognize, like “Monthly support”.">
            {(id) => (
              <Input id={id} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Monthly support" />
            )}
          </Field>
          <Field label="How much do you want to set aside?">
            {(id) => (
              <Input
                id={id}
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="15000"
                inputMode="decimal"
              />
            )}
          </Field>
          {amt > 0 && phpRate !== null ? (
            <p className="mt-2 hint">{peso(amt)} at today&rsquo;s rate</p>
          ) : null}
        </section>

        {/* Check-in frequency */}
        <section>
          <h2 className="text-[19px] font-bold text-ink">How often will you check in?</h2>
          <p className="mt-1 hint">
            If you don&rsquo;t check in within this time, the money opens to your family.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {intervals.map((i) => (
              <button
                key={i.minutes}
                onClick={() => setIntervalMinutes(i.minutes)}
                className={`rounded-xl border p-4 text-left ${
                  intervalMinutes === i.minutes ? "border-ink bg-ink text-paper" : "border-line bg-white text-ink"
                }`}
              >
                <span className="block text-[17px] font-semibold">{i.label}</span>
                {i.note ? (
                  <span
                    className={`mt-0.5 block text-[13px] ${
                      intervalMinutes === i.minutes ? "text-paper/80" : "text-subtle"
                    }`}
                  >
                    {i.note}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </section>

        {/* Backup beneficiary — if the receiver passes away after receiving */}
        <section>
          <h2 className="text-[19px] font-bold text-ink">What if they pass away after receiving?</h2>
          <p className="mt-1 hint">
            Once {recipientName || "your loved one"} receives this money, Sagip can keep protecting it. Name
            someone else — a sibling, spouse, or child — who should receive it if {recipientName || "they"}{" "}
            can no longer check in, including if they pass away.
          </p>
          {!useBackup && backupChoices.length > 0 ? (
            <p className="mt-3 rounded-xl border border-marigold/40 bg-marigold/10 px-4 py-3 text-[14px] leading-relaxed text-body">
              <span className="font-semibold text-ink">Without a backup,</span> if {recipientName} receives
              this and later passes away, the money stays in their account with no automatic next step in
              Sagip.
            </p>
          ) : null}
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
                If {recipientName || "they"} can&rsquo;t check in after receiving — including if they pass
                away — this person receives next. Enforced on Stellar.
              </span>
            </span>
          </label>

          {useBackup ? (
            <div className="mt-4 space-y-4 rounded-xl border border-line bg-white p-5">
              {backupChoices.length === 0 ? (
                <p className="text-[15px] text-body">
                  Add another loved one first — the backup must be someone different from the primary receiver.
                </p>
              ) : (
                <>
                  <div className="space-y-3">
                    {backupChoices.map((r) => (
                      <label
                        key={r.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${
                          backupRecipientId === r.id ? "border-ink bg-ink/5" : "border-line"
                        }`}
                      >
                        <input
                          type="radio"
                          name="backup"
                          className="h-5 w-5 accent-[#0C3B3A]"
                          checked={backupRecipientId === r.id}
                          onChange={() => setBackupRecipientId(r.id)}
                        />
                        <span>
                          <span className="block text-[17px] font-semibold text-ink">{r.name}</span>
                          <span className="block text-[15px] text-subtle">{r.relationship}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-ink">
                      How often should {recipientName} check in after receiving?
                    </p>
                    <p className="mt-1 text-[14px] text-subtle">
                      If they don&rsquo;t, {backupName} can receive the money.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {intervals.map((i) => (
                        <button
                          key={i.minutes}
                          type="button"
                          onClick={() => setReceiverIntervalMinutes(i.minutes)}
                          className={`rounded-xl border p-3 text-left ${
                            receiverIntervalMinutes === i.minutes
                              ? "border-ink bg-ink text-paper"
                              : "border-line bg-paper text-ink"
                          }`}
                        >
                          <span className="block text-[15px] font-semibold">{i.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </section>

        {error ? (
          <p className="text-[15px] font-medium text-danger" role="alert">
            {error}
          </p>
        ) : null}

        {!reviewing ? (
          <Button
            fullWidth
            onClick={review}
            disabled={addingNew && recipients.length === 0}
          >
            Review
          </Button>
        ) : (
          <div className="card border-2 border-ink p-6">
            <h2 className="font-display text-[22px] font-bold text-ink">Please review</h2>
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
                <dd className="font-semibold text-ink">{recipientName}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-subtle">Opens to family</dt>
                <dd className="font-semibold text-ink">if you don&rsquo;t check in {intervalLabel(intervalMinutes)}</dd>
              </div>
              {useBackup && backupRecipientId ? (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-subtle">If {recipientName} can&rsquo;t check in after receiving</dt>
                  <dd className="text-right font-semibold text-ink">
                    goes to {backupName}
                    <span className="block text-[13px] font-normal text-subtle">
                      after {intervalLabel(receiverIntervalMinutes)} without check-in
                    </span>
                  </dd>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-subtle">Network fee</dt>
                <dd className="font-semibold text-ink">less than {formatMoney(NETWORK_FEE_XLM)} (free)</dd>
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
              <Button
                fullWidth
                variant="ghost"
                onClick={() => setReviewing(false)}
                disabled={submitting}
              >
                Go back
              </Button>
            </div>
            <p className="mt-3 text-center text-[13px] text-subtle">
              You can take this money back at any time while it&rsquo;s still yours.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
