"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

const steps = [
  {
    n: "1",
    title: "Add a loved one",
    body: "Add the person you want to prepare for and keep their contact details current. A phone number helps with future recovery and verification work.",
  },
  {
    n: "2",
    title: "Choose the right family tool",
    body: "Use a safety net for ongoing protection, a gift for a known date, a tuition plan for scheduled support, or a split plan for several people.",
  },
  {
    n: "3",
    title: "Set clear rules",
    body: "Choose the amount, recipient, backup person, and check-in timing. Review every detail before confirming because money actions may not be reversible.",
  },
  {
    n: "4",
    title: "Check in and review",
    body: "Check in before the timer ends, review your plan regularly, and update your family if claim instructions change.",
  },
  {
    n: "5",
    title: "Prepare your family",
    body: "Privately share the claim link or printed card, verify your email, keep recovery information safe, and tell your family what Sagip can and cannot do.",
  },
];

const faqs = [
  {
    q: "Is my money guaranteed to be safe?",
    a: "No financial system is risk-free. Sagip currently runs on Stellar testnet with fictional value. The app encrypts wallet keys and records transactions, but the present model is custodial and still needs independent security review, regulated partners, and production controls before real-money use.",
  },
  {
    q: "Does missing a check-in prove something happened to me?",
    a: "No. A missed check-in is only a rule you configured. It is not proof of death, incapacity, or an emergency. Choose a reasonable interval, add a backup person, and make sure your family understands the rule.",
  },
  {
    q: "Does my family need to sign up?",
    a: "The current claim flow is designed so a recipient can use a private claim link without creating a full sender account. Production identity checks may still be required by a regulated payment or cash-out partner.",
  },
  {
    q: "Can Sagip change or move funds?",
    a: "Sagip currently operates encrypted custodial signing keys so it can perform actions confirmed through the app. Stellar receipts make activity verifiable, but production should add independent key controls, audits, and stronger recovery safeguards.",
  },
  {
    q: "What if Sagip becomes unavailable?",
    a: "Exporting wallet recovery information reduces dependency on the service, but recovery must be tested and stored safely. A production version should also support redundant recovery providers and documented continuity procedures.",
  },
];

export default function GuidePage() {
  return (
    <AppShell>
      <h1 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">How Sagip works</h1>
      <p className="mt-2 max-w-2xl text-[17px] text-body">
        Build a family plan people understand before they need it. The current app is a testnet preview, not a bank, insurer, remittance service, or legal estate plan.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Link href="/home/tools/checkup"><Button size="md">Check family readiness</Button></Link>
        <Link href="/home/trust"><Button size="md" variant="secondary">Review trust &amp; safety</Button></Link>
      </div>

      <ol className="mt-8 max-w-2xl space-y-4">
        {steps.map((s) => (
          <li key={s.n} className="card flex gap-5 p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink font-display text-[19px] font-bold text-paper">{s.n}</span>
            <div>
              <h2 className="text-[19px] font-bold text-ink">{s.title}</h2>
              <p className="mt-1 text-[16px] leading-relaxed text-body">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="mt-12 font-display text-[24px] font-bold text-ink">Common questions</h2>
      <div className="mt-4 max-w-2xl space-y-3">
        {faqs.map((f) => (
          <div key={f.q} className="card p-6">
            <h3 className="text-[17px] font-bold text-ink">{f.q}</h3>
            <p className="mt-1 text-[16px] leading-relaxed text-body">{f.a}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 max-w-2xl">
        <Link href="/home/new"><Button>Set up a test safety net</Button></Link>
      </div>
    </AppShell>
  );
}
