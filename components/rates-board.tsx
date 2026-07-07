"use client";

import { useEffect, useState } from "react";
import { ratesService } from "@/services/rates-service";
import { CURRENCIES, currencyMeta, formatFiat } from "@/lib/format";
import type { Rates } from "@/services/types";

/** Live "1 XLM = ..." board. Refreshes on its own. */
export function RatesBoard() {
  const [rates, setRates] = useState<Rates | null>(null);
  const [error, setError] = useState(false);

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

  const ordered = CURRENCIES.filter((c) => rates?.rates[c.code] !== undefined);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-bold text-ink">Today&rsquo;s value</h2>
        {rates ? (
          <span className="text-[13px] text-subtle">
            {rates.stale ? "Last known" : "Live"} · updates every minute
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[14px] text-subtle">What 1 unit of your funds is worth right now.</p>

      {error && !rates ? (
        <p className="mt-4 text-[15px] text-subtle">Rates aren&rsquo;t available right now.</p>
      ) : !rates ? (
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-line/60" />
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ordered.map((c) => (
            <div key={c.code} className="rounded-xl border border-line bg-paper px-4 py-3">
              <p className="text-[13px] font-semibold text-subtle">{c.code}</p>
              <p className="mt-0.5 text-[17px] font-bold text-ink">
                {formatFiat(rates.rates[c.code], c.code)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
