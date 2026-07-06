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
import type { Recipient } from "@/services/types";

const intervals = [
  { days: 7, label: "Every week" },
  { days: 30, label: "Every month" },
  { days: 90, label: "Every 3 months" },
  { days: 180, label: "Every 6 months" },
];

export default function NewSafetyNetPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  const [recipientId, setRecipientId] = useState<string>("");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [intervalDays, setIntervalDays] = useState(30);

  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRelationship, setNewRelationship] = useState("");
  const [savingRecipient, setSavingRecipient] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authService.isSignedIn()) {
      router.replace("/sign-in");
      return;
    }
    recipientService
      .list()
      .then((list) => {
        setRecipients(list);
        setRecipientId(list[0]?.id ?? "");
        setAddingNew(list.length === 0);
      })
      .catch(() => authService.signOut())
      .finally(() => setReady(true));
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

  async function submit() {
    setError(null);
    if (!recipientId) {
      setError("Please choose who this is for.");
      return;
    }
    if (label.trim().length < 2) {
      setError("Please give this a short name, like “Monthly support”.");
      return;
    }
    if (!(Number(amount) > 0)) {
      setError("Please enter how much you want to set aside.");
      return;
    }
    setSubmitting(true);
    try {
      const net = await safetyNetService.create({
        label,
        amount,
        recipientId,
        checkInIntervalDays: intervalDays,
      });
      router.push(`/home/${net.id}`);
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
                key={i.days}
                onClick={() => setIntervalDays(i.days)}
                className={`rounded-xl border p-4 text-left text-[17px] font-semibold ${
                  intervalDays === i.days ? "border-ink bg-ink text-paper" : "border-line bg-white text-ink"
                }`}
              >
                {i.label}
              </button>
            ))}
          </div>
        </section>

        {error ? (
          <p className="text-[15px] font-medium text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <Button fullWidth loading={submitting} onClick={submit} disabled={addingNew && recipients.length === 0}>
          Set aside money
        </Button>
      </div>
    </AppShell>
  );
}
