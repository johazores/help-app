"use client";

import { useEffect, useMemo, useState } from "react";
import { ratesService } from "@/services/rates-service";
import { CURRENCIES, formatFiat } from "@/lib/format";
import type { Rates } from "@/services/types";

// Selectable units: your funds (XLM) plus the fiat currencies we track.
const UNITS: { code: string; label: string }[] = [
  { code: "XLM", label: "Stellar (your funds)" },
  ...CURRENCIES.map((c) => ({ code: c.code, label: `${c.code} — ${c.label}` })),
];

/** Everything is converted through XLM, since rates are “fiat per 1 XLM”. */
function toXlm(amount: number, code: string, rates: Record<string, number>): number {
  if (code === "XLM") return amount;
  const r = rates[code];
  return r ? amount / r : 0;
}
function fromXlm(xlm: number, code: string, rates: Record<string, number>): number {
  if (code === "XLM") return xlm;
  const r = rates[code];
  return r ? xlm * r : 0;
}
function convert(amount: number, from: string, to: string, rates: Record<string, number>): number {
  return fromXlm(toXlm(amount, from, rates), to, rates);
}

function formatUnit(value: number, code: string): string {
  if (!Number.isFinite(value)) return "—";
  if (code === "XLM") {
    return `${value.toLocaleString("en-US", { maximumFractionDigits: 4 })} XLM`;
  }
  return formatFiat(value, code);
}

export function CurrencyConverter({
  defaultFrom = "XLM",
  defaultTo = "PHP",
  defaultAmount = "100",
}: {
  defaultFrom?: string;
  defaultTo?: string;
  defaultAmount?: string;
}) {
  const [rates, setRates] = useState<Rates | null>(null);
  const [error, setError] = useState(false);
  const [amount, setAmount] = useState(defaultAmount);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  useEffect(() => {
    let alive = true;
    const load = () =>
      ratesService
        .get()
        .then((r) => alive && setRates(r))
        .catch(() => alive && setError(true));
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // Only offer currencies we actually have a rate for (XLM is always available).
  const available = useMemo(() => {
    if (!rates) return UNITS;
    return UNITS.filter((u) => u.code === "XLM" || rates.rates[u.code] !== undefined);
  }, [rates]);

  const numeric = Number(amount) || 0;
  const result = rates ? convert(numeric, from, to, rates.rates) : 0;
  const perOne = rates ? convert(1, from, to, rates.rates) : 0;

  function swap() {
    setFrom(to);
    setTo(from);
  }

  const quickList = rates
    ? CURRENCIES.filter((c) => c.code !== from && rates.rates[c.code] !== undefined).slice(0, 6)
    : [];

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-bold text-ink">Currency converter</h2>
        {rates ? (
          <span className="text-[13px] text-subtle">{rates.stale ? "Last known" : "Live"}</span>
        ) : null}
      </div>
      <p className="mt-1 text-[14px] text-subtle">See what your funds are worth in any currency.</p>

      {error && !rates ? (
        <p className="mt-4 text-[15px] text-subtle">Rates aren&rsquo;t available right now.</p>
      ) : (
        <>
          {/* From */}
          <div className="mt-5">
            <label className="field-label">Amount</label>
            <div className="flex gap-3">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                className="h-14 w-full rounded-xl border border-line bg-white px-4 text-[19px] font-semibold text-ink focus:border-ink"
                placeholder="0"
              />
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-14 shrink-0 rounded-xl border border-line bg-white px-3 text-[16px] font-semibold text-ink focus:border-ink"
                aria-label="Convert from"
              >
                {available.map((u) => (
                  <option key={u.code} value={u.code}>
                    {u.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swap */}
          <div className="my-3 flex justify-center">
            <button
              onClick={swap}
              aria-label="Swap currencies"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-paper text-ink hover:bg-ink hover:text-paper"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 4v13M7 4 4 7M7 4l3 3M17 20V7M17 20l3-3M17 20l-3-3" />
              </svg>
            </button>
          </div>

          {/* To (result) */}
          <div>
            <label className="field-label">Converts to</label>
            <div className="flex gap-3">
              <div className="flex h-14 w-full items-center rounded-xl border border-line bg-paper px-4 text-[19px] font-bold text-ink">
                {rates ? formatUnit(result, to) : "…"}
              </div>
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-14 shrink-0 rounded-xl border border-line bg-white px-3 text-[16px] font-semibold text-ink focus:border-ink"
                aria-label="Convert to"
              >
                {available.map((u) => (
                  <option key={u.code} value={u.code}>
                    {u.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {rates ? (
            <p className="mt-3 text-[14px] text-subtle">
              1 {from} = {formatUnit(perOne, to)} · updates every minute
            </p>
          ) : null}

          {/* Quick reference for the current amount */}
          {quickList.length > 0 ? (
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-[13px] font-semibold text-subtle">
                {formatUnit(numeric, from)} is also
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {quickList.map((c) => (
                  <div key={c.code} className="rounded-lg bg-paper px-3 py-2">
                    <span className="text-[12px] font-semibold text-subtle">{c.code}</span>
                    <span className="ml-2 text-[15px] font-bold text-ink">
                      {formatFiat(convert(numeric, from, c.code, rates!.rates), c.code)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
