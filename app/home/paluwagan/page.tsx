"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { authService } from "@/services/auth-service";
import { paluwaganClient, type PaluwaganSummary } from "@/services/paluwagan-service";
import { formatMoney } from "@/lib/format";

const freqs = [
  { minutes: 1, label: "Every minute (testing)" },
  { minutes: 10080, label: "Every week" },
  { minutes: 43200, label: "Every month" },
];

function freqLabel(m: number) {
  return freqs.find((f) => f.minutes === m)?.label.replace(" (testing)", "") ?? "on schedule";
}

export default function PaluwaganHome() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [groups, setGroups] = useState<PaluwaganSummary[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequencyMinutes, setFrequencyMinutes] = useState(43200);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authService.isSignedIn()) {
      router.replace("/sign-in");
      return;
    }
    paluwaganClient.list().then(setGroups).finally(() => setReady(true));
  }, [router]);

  async function create() {
    setError(null);
    setBusy(true);
    try {
      const res = await paluwaganClient.create({ name, amount, frequencyMinutes, pin });
      router.push(`/home/paluwagan/${res.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create it.");
      setBusy(false);
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
      <h1 className="mt-3 font-display text-[30px] font-bold text-ink sm:text-[36px]">Paluwagan</h1>
      <p className="mt-2 max-w-xl text-[16px] text-body">
        A savings circle with people you trust. Everyone chips in the same amount each round, and
        each round one member receives the whole pot. Invite-only — no strangers, ever.
      </p>

      <div className="mt-6 max-w-xl space-y-4">
        {groups.map((g) => (
          <Link key={g.id} href={`/home/paluwagan/${g.id}`} className="card block p-5 hover:shadow-lift">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[18px] font-bold text-ink">{g.name}</p>
                <p className="text-[14px] text-subtle">
                  {formatMoney(g.amount)} {freqLabel(g.frequencyMinutes).toLowerCase()} · {g.memberCount}{" "}
                  member{g.memberCount === 1 ? "" : "s"}
                  {g.status === "ACTIVE" ? ` · round ${g.currentCycle}` : ""}
                </p>
              </div>
              <Badge tone={g.status === "ACTIVE" ? "active" : g.status === "COMPLETED" ? "received" : g.status === "DRAFT" ? "open" : "closed"}>
                {g.status === "DRAFT" ? "Gathering" : g.status === "ACTIVE" ? "Running" : g.status === "COMPLETED" ? "Finished" : "Closed"}
              </Badge>
            </div>
          </Link>
        ))}

        {!creating ? (
          <Button fullWidth variant={groups.length ? "ghost" : "primary"} onClick={() => setCreating(true)}>
            + Start a paluwagan
          </Button>
        ) : (
          <div className="card space-y-5 p-6">
            <h2 className="text-[18px] font-bold text-ink">Start a paluwagan</h2>
            <Field label="Name it">
              {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="Barkada fund" />}
            </Field>
            <Field label="How much does each member give per round?">
              {(id) => <Input id={id} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="1000" inputMode="decimal" />}
            </Field>
            <div>
              <p className="field-label">How often?</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {freqs.map((f) => (
                  <button key={f.minutes} onClick={() => setFrequencyMinutes(f.minutes)}
                    className={`rounded-xl border p-3 text-[15px] font-semibold ${frequencyMinutes === f.minutes ? "border-ink bg-ink text-paper" : "border-line bg-white text-ink"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Confirm with your PIN" error={error ?? undefined}>
              {(id) => <Input id={id} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" inputMode="numeric" className="tracking-[0.5em]" />}
            </Field>
            <p className="text-[13px] leading-relaxed text-subtle">
              These rules lock once the group starts. Only invite people you truly trust — Sagip
              organizes the rounds, but the promise to keep paying is between all of you.
            </p>
            <div className="flex gap-3">
              <Button loading={busy} onClick={create}>Create</Button>
              <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
