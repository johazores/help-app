"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ratesService } from "@/services/rates-service";
import { convertFromHeld, formatFiat, formatMoney } from "@/lib/format";
import type { Rates } from "@/services/types";

/** Wallet summary: available balance in plain units + live peso value. */
export function BalanceCard({ balance, rates: ratesProp }: { balance: string; rates?: Rates | null }) {
  const [rates, setRates] = useState<Rates | null>(ratesProp ?? null);

  useEffect(() => {
    if (ratesProp) {
      setRates(ratesProp);
      return;
    }
    ratesService.get().then(setRates).catch(() => {});
  }, [ratesProp]);

  const php = rates?.rates.PHP;
  const stable = rates?.base === "USDC";

  return (
    <div className="card bg-ink p-6 text-paper">
      <p className="text-[15px] text-paper/70">Your available funds</p>
      <p className="mt-1 break-words font-display text-[clamp(30px,8vw,40px)] font-bold leading-none">{formatMoney(balance)}</p>
      {stable ? (
        <p className="mt-1 text-[13px] text-paper/60">Stable value — held in USDC</p>
      ) : null}
      {php !== undefined ? (
        <p className="mt-2 text-[15px] text-marigold-soft">
          about {formatFiat(convertFromHeld(balance, php), "PHP")} today
          {rates?.stale ? " (last known rate)" : ""}
        </p>
      ) : null}
      <Link
        href="/home/deposit"
        className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-marigold px-5 text-[15px] font-semibold text-ink hover:bg-marigold-deep hover:text-paper"
      >
        Add funds
      </Link>
    </div>
  );
}
