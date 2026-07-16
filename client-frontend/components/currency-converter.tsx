"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ratesService } from "@/services/rates-service";
import { CURRENCIES, formatFiat } from "@/lib/format";
import type { Rates } from "@/services/types";

const HELD_LABEL: Record<string, string> = {
  USDC: "Your funds (USDC)",
  XLM: "Stellar (your funds)",
};

function heldUnit(base: string): { code: string; label: string } {
  return { code: base, label: HELD_LABEL[base] ?? "Your funds" };
}

/** Convert through the held asset base (USDC ≈ 1 USD, or XLM). */
function toHeld(amount: number, code: string, base: string, rates: Record<string, number>): number {
  if (code === base) return amount;
  const rate = rates[code];
  return rate ? amount / rate : Number.NaN;
}

function fromHeld(held: number, code: string, base: string, rates: Record<string, number>): number {
  if (code === base) return held;
  const rate = rates[code];
  return rate ? held * rate : Number.NaN;
}

function convert(amount: number, from: string, to: string, base: string, rates: Record<string, number>): number {
  return fromHeld(toHeld(amount, from, base, rates), to, base, rates);
}

function formatUnit(value: number, code: string, base: string): string {
  if (!Number.isFinite(value)) return "—";
  if (code === base) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
  }
  return formatFiat(value, code);
}

function decimalInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole = "", ...decimals] = cleaned.split(".");
  return decimals.length > 0 ? `${whole}.${decimals.join("")}` : whole;
}

export function CurrencyConverter({
  defaultFrom = "PHP",
  defaultTo = "USD",
  defaultAmount = "1000",
  title = "Currency converter",
  description = "Plan family support across currencies using current estimates.",
}: {
  defaultFrom?: string;
  defaultTo?: string;
  defaultAmount?: string;
  title?: string;
  description?: string;
}) {
  const [rates, setRates] = useState<Rates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState(defaultAmount);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const next = force ? await ratesService.refresh() : await ratesService.get();
      setRates(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Rates aren't available right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const next = await ratesService.get();
        if (alive) setRates(next);
      } catch (loadError) {
        if (alive) setError(loadError instanceof Error ? loadError.message : "Rates aren't available right now.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 5 * 60_000);

    function onVisible() {
      if (document.visibilityState === "visible") void load();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const base = rates?.base ?? "USDC";

  const available = useMemo(() => {
    const units = [
      heldUnit(base),
      ...CURRENCIES.filter((currency) => currency.code !== base).map((currency) => ({
        code: currency.code,
        label: `${currency.code} — ${currency.label}`,
      })),
    ];
    if (!rates) return units;
    return units.filter((unit) => unit.code === base || rates.rates[unit.code] !== undefined);
  }, [base, rates]);

  useEffect(() => {
    if (!rates || available.length === 0) return;
    const codes = new Set(available.map((unit) => unit.code));
    if (!codes.has(from)) setFrom(base);
    if (!codes.has(to)) {
      const preferred = codes.has("PHP") ? "PHP" : available.find((unit) => unit.code !== base)?.code ?? base;
      setTo(preferred);
    }
  }, [available, base, from, rates, to]);

  const numeric = Number(amount);
  const validAmount = Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
  const result = rates ? convert(validAmount, from, to, base, rates.rates) : Number.NaN;
  const perOne = rates ? convert(1, from, to, base, rates.rates) : Number.NaN;

  function swap() {
    setFrom(to);
    setTo(from);
  }

  const quickList = rates
    ? CURRENCIES.filter(
        (currency) => currency.code !== from && currency.code !== to && rates.rates[currency.code] !== undefined,
      ).slice(0, 6)
    : [];

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[18px] font-bold text-ink">{title}</h2>
        {rates ? (
          <span className={`rounded-full px-3 py-1 text-[12px] font-semibold ${rates.stale ? "bg-marigold/15 text-ink" : "bg-sage/15 text-ink"}`}>
            {rates.stale ? "Last known rates" : "Current estimate"}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[14px] leading-relaxed text-subtle">{description}</p>

      {error && !rates ? (
        <div className="mt-5 rounded-xl border border-line bg-paper p-4">
          <p className="text-[15px] text-body">{error}</p>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={loading}
            className="mt-3 text-[15px] font-semibold text-ink underline disabled:opacity-60"
          >
            {loading ? "Trying again…" : "Try again"}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-5">
            <label className="field-label" htmlFor="converter-amount">Amount</label>
            <div className="flex gap-3">
              <input
                id="converter-amount"
                value={amount}
                onChange={(event) => setAmount(decimalInput(event.target.value))}
                inputMode="decimal"
                className="h-14 min-w-0 flex-1 rounded-xl border border-line bg-white px-4 text-[19px] font-semibold text-ink focus:border-ink"
                placeholder="0"
              />
              <select
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="h-14 w-28 shrink-0 rounded-xl border border-line bg-white px-3 text-[16px] font-semibold text-ink focus:border-ink sm:w-40"
                aria-label="Convert from"
              >
                {available.map((unit) => (
                  <option key={unit.code} value={unit.code}>{unit.code}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="my-3 flex justify-center">
            <button
              type="button"
              onClick={swap}
              aria-label="Swap currencies"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-paper text-ink hover:bg-ink hover:text-paper"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 4v13M7 4 4 7M7 4l3 3M17 20V7M17 20l3-3M17 20l-3-3" />
              </svg>
            </button>
          </div>

          <div>
            <label className="field-label" htmlFor="converter-to">Estimated value</label>
            <div className="flex gap-3">
              <div
                className="flex h-14 min-w-0 flex-1 items-center overflow-hidden rounded-xl border border-line bg-paper px-4 text-[19px] font-bold text-ink"
                aria-live="polite"
              >
                <span className="truncate">{rates ? formatUnit(result, to, base) : "Loading…"}</span>
              </div>
              <select
                id="converter-to"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="h-14 w-28 shrink-0 rounded-xl border border-line bg-white px-3 text-[16px] font-semibold text-ink focus:border-ink sm:w-40"
                aria-label="Convert to"
              >
                {available.map((unit) => (
                  <option key={unit.code} value={unit.code}>{unit.code}</option>
                ))}
              </select>
            </div>
          </div>

          {rates ? (
            <p className="mt-3 text-[14px] text-subtle">
              1 {from} = {formatUnit(perOne, to, base)} · estimates refresh every few minutes
            </p>
          ) : null}

          {quickList.length > 0 ? (
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-[13px] font-semibold text-subtle">The same amount is approximately</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {quickList.map((currency) => (
                  <div key={currency.code} className="rounded-lg bg-paper px-3 py-2">
                    <span className="text-[12px] font-semibold text-subtle">{currency.code}</span>
                    <span className="ml-2 text-[15px] font-bold text-ink">
                      {formatFiat(convert(validAmount, from, currency.code, base, rates!.rates), currency.code)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      <div className="mt-5 border-t border-line pt-4 text-[12px] leading-relaxed text-subtle">
        <p>Planning estimate only. Your payment or cash-out partner may use a different rate and charge fees.</p>
        {rates?.sources?.length ? (
          <p className="mt-1">
            Sources: {rates.sources.map((source, index) => (
              <span key={`${source.name}-${source.url}`}>
                {index > 0 ? ", " : ""}
                <a href={source.url} target="_blank" rel="noreferrer" className="font-semibold text-ink underline">{source.name}</a>
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </div>
  );
}