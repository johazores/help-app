"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import { PageSpinner } from "@/components/ui/spinner";
import { LoadErrorBanner } from "@/components/load-error-banner";
import { authService } from "@/services/auth-service";
import { potService } from "@/services/pot-service";
import { handleProtectedLoadError, loadErrorMessage } from "@/lib/api-errors";
import { decimalInput, formatMoney } from "@/lib/format";
import type { Pot } from "@/services/types";

export default function PotsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pots, setPots] = useState<Pot[]>([]);
  const [balance, setBalance] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [addAmounts, setAddAmounts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [potError, setPotError] = useState<{ id: string; message: string } | null>(null);
  const [removing, setRemoving] = useState<Pot | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [list, me] = await Promise.all([potService.list(), authService.me()]);
      setPots(list);
      setBalance(me.balance);
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
    if (creating) return;
    setCreateError(null);
    setCreating(true);
    try {
      const pot = await potService.create(name.trim(), target);
      setPots((prev) => [...prev, pot]);
      setName("");
      setTarget("");
    } catch (err) {
      setCreateError(loadErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function addTo(pot: Pot) {
    const amount = addAmounts[pot.id];
    if (busyId) return;
    if (!(Number(amount) > 0)) {
      setPotError({ id: pot.id, message: "Please enter an amount to add." });
      return;
    }
    setBusyId(pot.id);
    setPotError(null);
    try {
      const res = await potService.addTo(pot.id, amount);
      setPots((prev) => prev.map((p) => (p.id === pot.id ? { ...p, saved: res.saved } : p)));
      setAddAmounts((prev) => ({ ...prev, [pot.id]: "" }));
    } catch (err) {
      setPotError({ id: pot.id, message: loadErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  async function confirmRemove() {
    if (!removing || busyId) return;
    const pot = removing;
    setBusyId(pot.id);
    setPotError(null);
    try {
      await potService.remove(pot.id);
      setPots((prev) => prev.filter((p) => p.id !== pot.id));
      setRemoving(null);
    } catch (err) {
      setPotError({ id: pot.id, message: loadErrorMessage(err) });
      setRemoving(null);
    } finally {
      setBusyId(null);
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
      <h1 className="mt-1 font-display text-[30px] font-bold text-ink sm:text-[36px]">Savings goals</h1>
      <p className="mt-2 max-w-xl text-[16px] text-body">
        Mark money in your wallet for something that matters. When a goal is full, send it as a
        gift in a couple of taps.
      </p>

      {loadError ? (
        <div className="mt-6 max-w-xl">
          <LoadErrorBanner message={loadError} onRetry={() => void load()} />
        </div>
      ) : null}

      {balance !== null ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[14px] font-semibold text-paper">
          In your wallet: {formatMoney(balance)}
        </p>
      ) : null}

      <div className="mt-6 max-w-xl space-y-4">
        {pots.map((pot) => {
          const saved = Number(pot.saved);
          const targetN = Number(pot.target);
          const pct = targetN > 0 ? Math.min(100, (saved / targetN) * 100) : 0;
          const full = saved >= targetN;
          const inputId = `add-${pot.id}`;
          return (
            <section key={pot.id} className="card p-5" aria-labelledby={`pot-${pot.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id={`pot-${pot.id}`} className="break-words text-[18px] font-bold text-ink">{pot.name}</h2>
                  <p className="text-[15px] text-subtle">
                    {formatMoney(pot.saved)} of {formatMoney(pot.target)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRemoving(pot)}
                  className="min-h-11 px-2 text-[14px] font-semibold text-subtle hover:text-danger"
                >
                  Remove
                </button>
              </div>
              <div
                className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-line"
                role="progressbar"
                aria-label={`${pot.name} progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(pct)}
              >
                <div className={`h-full rounded-full ${full ? "bg-marigold" : "bg-ink"}`} style={{ width: `${Math.max(3, pct)}%` }} />
              </div>
              {full ? (
                <Link
                  href={`/home/tools/gift?label=${encodeURIComponent(pot.name)}&amount=${encodeURIComponent(String(saved))}`}
                  className={`mt-4 ${buttonClasses({ variant: "secondary", size: "md" })}`}
                >
                  Goal reached — send it as a gift
                </Link>
              ) : (
                <div className="mt-4 flex gap-3">
                  <label htmlFor={inputId} className="sr-only">Amount to add to {pot.name}</label>
                  <Input
                    id={inputId}
                    value={addAmounts[pot.id] ?? ""}
                    onChange={(e) => setAddAmounts((prev) => ({ ...prev, [pot.id]: decimalInput(e.target.value) }))}
                    placeholder="Add amount"
                    inputMode="decimal"
                    autoComplete="off"
                    className="h-12"
                  />
                  <Button size="md" loading={busyId === pot.id} disabled={busyId !== null} onClick={() => addTo(pot)}>
                    Add
                  </Button>
                </div>
              )}
              {potError?.id === pot.id ? (
                <p role="alert" className="mt-3 text-[15px] font-medium text-danger">{potError.message}</p>
              ) : null}
            </section>
          );
        })}

        <form onSubmit={create} noValidate className="card space-y-4 p-6">
          <h2 className="text-[18px] font-bold text-ink">Start a new goal</h2>
          <Field label="What are you saving for?">
            {(id, control) => (
              <Input id={id} {...control} value={name} onChange={(e) => setName(e.target.value)} placeholder="Roof repair" maxLength={40} />
            )}
          </Field>
          <Field label="Target amount" error={createError}>
            {(id, control) => (
              <Input
                id={id}
                {...control}
                value={target}
                onChange={(e) => setTarget(decimalInput(e.target.value))}
                placeholder="200"
                inputMode="decimal"
                autoComplete="off"
              />
            )}
          </Field>
          <Button type="submit" size="md" loading={creating}>Start goal</Button>
        </form>
      </div>

      <Dialog
        open={removing !== null}
        onClose={() => (busyId ? undefined : setRemoving(null))}
        title={`Remove “${removing?.name ?? ""}”?`}
        description="This only removes the goal. Your money stays in your wallet."
      >
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button fullWidth variant="danger" loading={busyId !== null} onClick={confirmRemove}>
            Remove goal
          </Button>
          <Button fullWidth variant="ghost" disabled={busyId !== null} onClick={() => setRemoving(null)}>
            Keep it
          </Button>
        </div>
      </Dialog>
    </AppShell>
  );
}
