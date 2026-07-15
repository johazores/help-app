"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

/** Cash-out shell — honest preview until a SEP-24 anchor partner is wired in. */
export default function WithdrawPage() {
  return (
    <AppShell>
      <Link href="/home" className="text-[15px] font-semibold text-subtle hover:text-ink">
        ← Back
      </Link>
      <h1 className="mt-3 font-display text-[30px] font-bold text-ink sm:text-[36px]">Move to your pocket</h1>
      <p className="mt-2 max-w-xl text-[17px] text-body">
        When you receive money in Sagip, you can move it to GCash, Maya, or a bank account — the same way
        remittance apps work.
      </p>

      <div className="mt-8 max-w-xl space-y-4">
        <div className="card border-2 border-marigold/40 bg-marigold/10 p-6">
          <p className="text-[17px] font-bold text-ink">Coming soon</p>
          <p className="mt-2 text-[15px] leading-relaxed text-body">
            Receiving money in Sagip works end-to-end today. Moving it to pesos requires a licensed
            payment partner (Stellar SEP-24 anchor) — we&rsquo;re sequencing that as the next production
            milestone, not hiding it.
          </p>
        </div>

        <div className="card p-6 opacity-60">
          <p className="text-[15px] font-semibold text-subtle">Planned options</p>
          <ul className="mt-3 space-y-2 text-[16px] text-body">
            <li>GCash — not yet available</li>
            <li>Maya — not yet available</li>
            <li>Bank account — not yet available</li>
          </ul>
        </div>

        <div className="card p-6">
          <p className="text-[15px] font-semibold text-ink">What works today</p>
          <p className="mt-2 text-[15px] leading-relaxed text-body">
            Your money is held safely under your name. Every movement has a verified permanent record.
            You can export a recovery key from{" "}
            <Link href="/home/wallets" className="font-semibold text-ink underline">
              Wallets
            </Link>{" "}
            at any time.
          </p>
          <Link href="/home/deposit" className="mt-4 inline-block">
            <Button size="md" variant="ghost">
              Add funds instead
            </Button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
