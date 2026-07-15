"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { configService } from "@/services/config-service";
import type { AppConfig } from "@/services/types";

export function TrustCenter({ insideApp = false }: { insideApp?: boolean }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [configUnavailable, setConfigUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    configService
      .get()
      .then((value) => {
        if (!cancelled) setConfig(value);
      })
      .catch(() => {
        if (!cancelled) setConfigUnavailable(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isTestnet = !config || config.network.toLowerCase() !== "public";

  return (
    <div className="max-w-4xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[14px] font-bold uppercase tracking-[0.12em] text-subtle">Trust &amp; safety</p>
          <h1 className="mt-2 font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Know exactly what Sagip does today.
          </h1>
          <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-body">
            Financial products earn trust by showing their limits, not hiding them. This page explains the
            current technology, custody model, protections, and what must still happen before real-money use.
          </p>
        </div>
        <div
          className={`shrink-0 rounded-2xl border px-4 py-3 text-[14px] font-semibold ${
            isTestnet ? "border-marigold/50 bg-marigold/10 text-ink" : "border-sage/40 bg-sage/15 text-ink"
          }`}
        >
          <p>{isTestnet ? "Testnet product preview" : "Public network"}</p>
          <p className="mt-1 text-[13px] font-normal text-subtle">
            {configUnavailable
              ? "Live configuration unavailable"
              : `${config?.heldAsset ?? "USDC"} on ${config?.network ?? "testnet"}`}
          </p>
        </div>
      </div>

      {isTestnet ? (
        <div className="mt-7 rounded-2xl border-2 border-marigold/50 bg-marigold/10 p-5">
          <p className="text-[17px] font-bold text-ink">No real money is used in this environment</p>
          <p className="mt-1 text-[15px] leading-relaxed text-body">
            Current balances and transactions are for testing and demonstration. Do not treat them as bank
            deposits, investments, insurance coverage, or legal estate instructions.
          </p>
        </div>
      ) : null}

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-[20px] font-bold text-ink">What is protected today</h2>
          <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-body">
            <TrustItem>Wallet secrets are encrypted before they are stored in the database.</TrustItem>
            <TrustItem>Sign-in sessions can be reviewed and revoked from the account page.</TrustItem>
            <TrustItem>Safety-net activity can include a Stellar transaction hash for independent verification.</TrustItem>
            <TrustItem>Users can export wallet recovery information from the Wallets area.</TrustItem>
          </ul>
        </section>

        <section className="card p-6">
          <h2 className="text-[20px] font-bold text-ink">The custody model</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-body">
            Sagip currently uses a custodial wallet model. Encrypted signing keys are held by the service so the
            app can carry out the actions a user confirms. This improves ease of use, but it also creates
            operational responsibility for Sagip.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-body">
            A production launch should add independent key controls, security review, recovery redundancy,
            incident procedures, and a regulated payment or virtual-asset partner before handling real funds.
          </p>
        </section>

        <section className="card p-6">
          <h2 className="text-[20px] font-bold text-ink">What Sagip is not</h2>
          <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-body">
            <TrustItem>It is not currently a bank, insurer, licensed remittance provider, or investment product.</TrustItem>
            <TrustItem>It is not a replacement for a will, estate plan, power of attorney, or legal advice.</TrustItem>
            <TrustItem>GCash, Maya, and Philippine bank cash-out are not connected yet.</TrustItem>
            <TrustItem>A missed check-in alone cannot prove death, incapacity, or an emergency.</TrustItem>
          </ul>
        </section>

        <section className="card p-6">
          <h2 className="text-[20px] font-bold text-ink">Required before real-money launch</h2>
          <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-body">
            <TrustItem>Licensed fiat deposit and withdrawal partner with clear fees and transaction status.</TrustItem>
            <TrustItem>Identity, sanctions, fraud, and anti-money-laundering controls appropriate to the partner model.</TrustItem>
            <TrustItem>Independent application and custody security assessment with a published remediation process.</TrustItem>
            <TrustItem>Customer support, complaints handling, incident communication, and business-continuity plans.</TrustItem>
          </ul>
        </section>
      </div>

      <section className="mt-5 rounded-2xl bg-ink p-6 text-paper sm:p-8">
        <h2 className="font-display text-[24px] font-bold">A safer way to use the preview</h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-paper/80">
          Test with small fictional amounts, verify transaction receipts, add a backup loved one, verify your
          email, and keep recovery information somewhere your family can find without exposing it publicly.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href={insideApp ? "/home/tools/checkup" : "/get-started"}
            className="inline-flex h-12 items-center justify-center rounded-xl bg-marigold px-6 text-[15px] font-semibold text-ink hover:bg-marigold-deep hover:text-paper"
          >
            {insideApp ? "Check family readiness" : "Try the testnet preview"}
          </Link>
          <Link
            href={insideApp ? "/home/wallets" : "/sign-in"}
            className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 px-6 text-[15px] font-semibold text-paper hover:bg-white/10"
          >
            {insideApp ? "Review wallets" : "Sign in"}
          </Link>
        </div>
      </section>
    </div>
  );
}

function TrustItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-sage" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}
