"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/app-shell";
import { CardSkeleton } from "@/components/page-skeleton";

const CurrencyConverter = dynamic(
  () => import("@/components/currency-converter").then((module) => module.CurrencyConverter),
  { loading: () => <CardSkeleton lines={5} /> },
);

export default function CurrencyPlanningPage() {
  return (
    <AppShell>
      <div className="max-w-3xl">
        <Link href="/home/tools" className="text-[15px] font-semibold text-subtle hover:text-ink">← Family tools</Link>
        <h1 className="mt-3 font-display text-[30px] font-bold text-ink sm:text-[36px]">Plan support across currencies</h1>
        <p className="mt-2 max-w-2xl text-[17px] leading-relaxed text-body">
          Estimate school fees, monthly support, gifts, or emergency money in the currency your family actually uses.
        </p>

        <div className="mt-7">
          <CurrencyConverter
            defaultFrom="PHP"
            defaultTo="USD"
            defaultAmount="10000"
            title="Family support converter"
            description="Compare a planned amount across common OFW and household currencies before creating a safety net or scheduled gift."
          />
        </div>

        <section className="mt-6 rounded-2xl border border-line bg-white p-6">
          <h2 className="text-[18px] font-bold text-ink">Turn the estimate into a family plan</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-body">
            Rates are only a planning guide. When the amount looks right, choose the family tool that matches the real need and leave room for provider fees or rate changes.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/home/new" className="rounded-xl bg-ink px-5 py-3 text-[15px] font-semibold text-paper hover:bg-ink-soft">Create safety net</Link>
            <Link href="/home/tools/gift?mode=parts" className="rounded-xl border border-line bg-paper px-5 py-3 text-[15px] font-semibold text-ink hover:bg-ink/5">Plan tuition support</Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}