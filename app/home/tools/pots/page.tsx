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
import { potService } from "@/services/pot-service";
import { formatMoney } from "@/lib/format";
import type { Pot } from "@/services/types";

export default function PotsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pots, setPots] = useState<Pot[]>([]);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [creating, setCreating] = useState(false);
  const [addAmounts, setAddAmounts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authService.isSignedIn()) {
      router.replace("/sign-in");
      return;
    }
    potService.list().then(setPots).finally(() => setReady(true));
  }, [router]);

  async function create() {
    setError(null);
    setCreating(true);
    try {
      const pot = await potService.create(name, target);
      setPots((prev) => [...prev, pot]);
      setName("");
      setTarget("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the goal.");
    } finally {
      setCreating(false);
    }
  }

  async function addTo(pot: Pot) {
    const amount = addAmounts[pot.id];
    if (!(Number(amount) > 0)) return;
    setBusyId(pot.id);
    try {
      const res = await potService.addTo(pot.id, amount);
      setPots((prev) => prev.map((p) => (p.id === pot.id ? { ...p, saved: res.saved } : p)));
      setAddAmounts((prev) => ({ ...prev, [pot.id]: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add to the goal.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(pot: Pot) {
    if (!confirm(`Remove “${pot.name}”? This only removes the goal — your money stays in your wallet.`)) return;
    await potService.remove(pot.id);
    setPots((prev) => prev.filter((p) => p.id !== pot.id));
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
      <h1 className="mt-3 font-display text-[30px] font-bold text-ink sm:text-[36px]">Savings goals</h1>
      <p className="mt-2 max-w-xl text-[16px] text-body">
        Mark money in your wallet for something that matters. When a goal is full, turn it into a
        gift or a safety net with one tap.
      </p>

      <div className="mt-6 max-w-xl space-y-4">
        {pots.map((pot) => {
          const saved = Number(pot.saved);
          const targetN = Number(pot.target);
          const pct = targetN > 0 ? Math.min(100, (saved / targetN) * 100) : 0;
          const full = saved >= targetN;
          return (
            <div key={pot.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[18px] font-bold text-ink">{pot.name}</p>
                  <p className="text-[15px] text-subtle">
                    {formatMoney(pot.saved)} of {formatMoney(pot.target)}
                  </p>
                </div>
                <button onClick={() => remove(pot)} className="text-[13px] font-semibold text-subtle hover:text-danger">
                  Remove
                </button>
              </div>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-line">
                <div className={`h-full rounded-full ${full ? "bg-marigold" : "bg-ink"}`} style={{ width: `${Math.max(3, pct)}%` }} />
              </div>
              {full ? (
                <Link href={`/home/tools/gift`} className="mt-4 inline-block">
                  <Button size="md" variant="secondary">Goal reached — send it as a gift</Button>
                </Link>
              ) : (
                <div className="mt-4 flex gap-3">
                  <Input
                    value={addAmounts[pot.id] ?? ""}
                    onChange={(e) => setAddAmounts((prev) => ({ ...prev, [pot.id]: e.target.value.replace(/[^\d.]/g, "") }))}
                    placeholder="Add amount"
                    inputMode="decimal"
                    className="h-12"
                  />
                  <Button size="md" loading={busyId === pot.id} onClick={() => addTo(pot)}>Add</Button>
                </div>
              )}
            </div>
          );
        })}

        <div className="card space-y-4 p-6">
          <h2 className="text-[18px] font-bold text-ink">Start a new goal</h2>
          <Field label="What are you saving for?">
            {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="Roof repair" />}
          </Field>
          <Field label="Target amount" error={error ?? undefined}>
            {(id) => <Input id={id} value={target} onChange={(e) => setTarget(e.target.value.replace(/[^\d.]/g, ""))} placeholder="20000" inputMode="decimal" />}
          </Field>
          <Button size="md" loading={creating} onClick={create}>Start goal</Button>
        </div>
      </div>
    </AppShell>
  );
}
