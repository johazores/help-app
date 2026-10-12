"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PinInput } from "@/components/ui/pin-input";
import { Field } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { ChoiceGrid } from "@/components/ui/choice-grid";
import { PageSpinner } from "@/components/ui/spinner";
import { LoadErrorBanner } from "@/components/load-error-banner";
import { authService } from "@/services/auth-service";
import { paluwaganClient, type PaluwaganSummary } from "@/services/paluwagan-service";
import { handleProtectedLoadError, loadErrorMessage } from "@/lib/api-errors";
import { CHECK_IN_INTERVALS, decimalInput, formatMoney, intervalPhrase } from "@/lib/format";

// Paluwagan rounds run weekly or monthly; "every minute" lets a group try a full cycle.
const freqs = CHECK_IN_INTERVALS.filter((i) => i.minutes !== 129600).map((i) => ({
  value: i.minutes,
  label: i.label,
  note: i.note,
}));

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
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setGroups(await paluwaganClient.list());
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

  async function create(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await paluwaganClient.create({ name, amount, frequencyMinutes, pin });
      router.push(`/home/paluwagan/${res.id}`);
    } catch (err) {
      setError(loadErrorMessage(err));
      setBusy(false);
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
      <h1 className="mt-1 font-display text-[30px] font-bold text-ink sm:text-[36px]">Paluwagan</h1>
      <p className="mt-2 max-w-xl text-[16px] text-body">
        A savings circle with people you trust. Everyone chips in the same amount each round, and
        each round one member receives the whole pot. Invite-only — no strangers, ever.
      </p>

      {loadError ? (
        <div className="mt-6 max-w-xl">
          <LoadErrorBanner message={loadError} onRetry={() => void load()} />
        </div>
      ) : null}

      <div className="mt-6 max-w-xl space-y-4">
        {groups.map((g) => (
          <Link key={g.id} href={`/home/paluwagan/${g.id}`} className="card block p-5 hover:shadow-lift">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[18px] font-bold text-ink">{g.name}</p>
                <p className="text-[14px] text-subtle">
                  {formatMoney(g.amount)} {intervalPhrase(g.frequencyMinutes)} · {g.memberCount}{" "}
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
          <form onSubmit={create} noValidate className="card space-y-5 p-6">
            <h2 className="text-[18px] font-bold text-ink">Start a paluwagan</h2>
            <Field label="Name it">
              {(id, control) => <Input id={id} {...control} value={name} onChange={(e) => setName(e.target.value)} placeholder="Barkada fund" maxLength={40} />}
            </Field>
            <Field label="How much does each member give per round?">
              {(id, control) => (
                <Input id={id} {...control} value={amount} onChange={(e) => setAmount(decimalInput(e.target.value))} placeholder="100" inputMode="decimal" autoComplete="off" />
              )}
            </Field>
            <section>
              <h3 className="field-label">How often?</h3>
              <ChoiceGrid label="How often?" columns={3} compact choices={freqs} value={frequencyMinutes} onChange={setFrequencyMinutes} />
            </section>
            <Field label="Confirm with your PIN" error={error}>
              {(id, control) => (
                <PinInput id={id} {...control} value={pin} onValueChange={setPin} autoComplete="current-password" placeholder="••••••" />
              )}
            </Field>
            <p className="text-[13px] leading-relaxed text-subtle">
              These rules lock once the group starts. Only invite people you truly trust — Sagip
              organizes the rounds, but the promise to keep paying is between all of you.
            </p>
            <div className="flex gap-3">
              <Button type="submit" loading={busy}>Create</Button>
              <Button variant="ghost" disabled={busy} onClick={() => setCreating(false)}>Cancel</Button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
