"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

type Mode = "now" | "date" | "parts";

function GiftForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [mode, setMode] = useState<Mode>(search?.get("mode") === "parts" ? "parts" : "now");
  const [ready, setReady] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [openDate, setOpenDate] = useState("");
  const [parts, setParts] = useState<{ amount: string; date: string }[]>([
    { amount: "", date: "" },
    { amount: "", date: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

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
      })
      .finally(() => setReady(true));
  }, [router]);

  async function submit() {
    setError(null);
    if (!recipientId) return setError("Please choose who this is for.");
    if (label.trim().length < 2) return setError("Please give it a short name, like “Birthday gift”.");
    setSubmitting(true);
    try {
      if (mode === "parts") {
        const valid = parts.filter((p) => Number(p.amount) > 0 && p.date);
        if (valid.length === 0) throw new Error("Please add at least one part with an amount and a date.");
        let last = "";
        for (let i = 0; i < valid.length; i++) {
          setDoneCount(i);
          const net = await safetyNetService.create({
            label: `${label.trim()} (${i + 1} of ${valid.length})`,
            amount: valid[i].amount,
            recipientId,
            kind: "GIFT",
            opensAt: new Date(`${valid[i].date}T08:00:00`).toISOString(),
          });
          last = net.id;
        }
        router.push(`/home/${last}?created=1`);
      } else {
        if (!(Number(amount) > 0)) throw new Error("Please enter an amount.");
        if (mode === "date" && !openDate) throw new Error("Please choose the date it opens.");
        const net = await safetyNetService.create({
          label: label.trim(),
          amount,
          recipientId,
          kind: "GIFT",
          opensAt: mode === "date" ? new Date(`${openDate}T08:00:00`).toISOString() : undefined,
        });
        router.push(`/home/${net.id}?created=1`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send this.");
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex justify-center py-20 text-ink">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  const modes: { id: Mode; label: string }[] = [
    { id: "now", label: "Send now" },
    { id: "date", label: "On a date" },
    { id: "parts", label: "In parts" },
  ];

  return (
    <>
      <Link href="/home/tools" className="text-[15px] font-semibold text-subtle hover:text-ink">← Family tools</Link>
      <h1 className="mt-3 font-display text-[30px] font-bold text-ink sm:text-[36px]">
        {mode === "parts" ? "Tuition plan" : "Send a gift"}
      </h1>
      <p className="mt-2 max-w-xl text-[16px] text-body">
        {mode === "parts"
          ? "Set aside school money that opens term by term, on the dates you choose. No check-ins — each part is theirs the moment its date arrives."
          : "No check-ins here — a gift is theirs the moment it opens. They receive it with the same easy link."}
      </p>

      <div className="mt-6 flex max-w-xl gap-2">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex-1 rounded-xl border px-3 py-3 text-[15px] font-semibold ${
              mode === m.id ? "border-ink bg-ink text-paper" : "border-line bg-white text-ink"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-6 max-w-xl space-y-5">
        <Field label="Who is it for?">
          {(id) => (
            <select
              id={id}
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
        {recipients.length === 0 ? (
          <p className="hint">
            You haven&rsquo;t added anyone yet.{" "}
            <Link href="/home/people" className="font-semibold text-ink underline">Add a loved one</Link> first.
          </p>
        ) : null}

        <Field label="Give it a short name">
          {(id) => <Input id={id} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={mode === "parts" ? "School year 2026" : "Happy birthday, Nanay"} />}
        </Field>

        {mode !== "parts" ? (
          <Field label="How much?">
            {(id) => <Input id={id} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="5000" inputMode="decimal" />}
          </Field>
        ) : null}

        {mode === "date" ? (
          <Field label="When should it open?" hint="They'll see it's waiting, and it opens on this day.">
            {(id) => <Input id={id} type="date" value={openDate} onChange={(e) => setOpenDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} />}
          </Field>
        ) : null}

        {mode === "parts" ? (
          <div className="space-y-3">
            <p className="field-label">The parts</p>
            {parts.map((part, i) => (
              <div key={i} className="flex gap-3">
                <Input value={part.amount} onChange={(e) => setParts((prev) => prev.map((x, j) => (j === i ? { ...x, amount: e.target.value.replace(/[^\d.]/g, "") } : x)))} placeholder="Amount" inputMode="decimal" />
                <Input type="date" value={part.date} onChange={(e) => setParts((prev) => prev.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} min={new Date().toISOString().slice(0, 10)} />
              </div>
            ))}
            {parts.length < 6 ? (
              <button onClick={() => setParts((p) => [...p, { amount: "", date: "" }])} className="text-[15px] font-semibold text-ink underline">
                + Add another part
              </button>
            ) : null}
            <p className="hint">Each part opens to them on its date — perfect for tuition per term.</p>
          </div>
        ) : null}

        {error ? <p className="text-[15px] font-medium text-danger" role="alert">{error}</p> : null}

        <Button fullWidth loading={submitting} onClick={submit} disabled={recipients.length === 0}>
          {submitting && mode === "parts" ? `Sending part ${doneCount + 1}…` : mode === "now" ? `Send${Number(amount) > 0 ? ` ${formatMoney(amount)}` : ""} now` : mode === "date" ? "Set the gift" : "Set the plan"}
        </Button>
      </div>
    </>
  );
}

export default function GiftPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="flex justify-center py-20 text-ink"><Spinner className="h-7 w-7" /></div>}>
        <GiftForm />
      </Suspense>
    </AppShell>
  );
}
