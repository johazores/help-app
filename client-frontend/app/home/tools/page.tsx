"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

const tools = [
  {
    href: "/home/tools/split",
    emoji: "👨‍👩‍👧",
    eyebrow: "Emergency planning",
    title: "Split a safety net",
    body: "Divide one amount across several loved ones so each person has a clear share and claim instruction.",
    bestFor: "Parents supporting several dependants",
  },
  {
    href: "/home/new?preset=abuloy",
    emoji: "🕯️",
    eyebrow: "Emergency planning",
    title: "Abuloy fund",
    body: "Prepare a simple family support plan for funeral and urgent household expenses.",
    bestFor: "Families that want a clear emergency purpose",
  },
  {
    href: "/home/tools/gift?mode=parts",
    emoji: "🎓",
    eyebrow: "Education",
    title: "Tuition plan",
    body: "Schedule school support to open term by term instead of releasing everything at once.",
    bestFor: "OFWs and relatives funding education",
  },
  {
    href: "/home/tools/gift",
    emoji: "🎁",
    eyebrow: "Giving",
    title: "Send a planned gift",
    body: "Prepare support for a birthday, graduation, holiday, or another known date.",
    bestFor: "One-time or scheduled family support",
  },
  {
    href: "/home/tools/pots",
    emoji: "🏺",
    eyebrow: "Planning",
    title: "Savings goals",
    body: "Track a family goal such as roof repair, school supplies, travel, or a celebration.",
    bestFor: "Visible progress toward a shared goal",
  },
  {
    href: "/home/paluwagan",
    emoji: "🔄",
    eyebrow: "Community",
    title: "Paluwagan",
    body: "Test a savings circle where members contribute directly to the person receiving each round.",
    bestFor: "Existing trusted groups with clear expectations",
  },
];

const situations = [
  { href: "/home/tools/checkup", label: "I am starting from zero" },
  { href: "/home/tools/split", label: "I support several people" },
  { href: "/home/tools/gift?mode=parts", label: "I pay school expenses" },
  { href: "/home/paluwagan", label: "We save as a group" },
];

export default function ToolsPage() {
  return (
    <AppShell>
      <div className="max-w-4xl">
        <h1 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">Family tools</h1>
        <p className="mt-2 max-w-2xl text-[17px] leading-relaxed text-body">
          Choose a tool for a real family need. Start with one plan everyone understands, then add more only when the basics are ready.
        </p>

        <section className="mt-7 rounded-2xl bg-ink p-6 text-paper sm:p-8">
          <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-marigold">Recommended first</p>
          <div className="mt-2 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-[25px] font-bold">Check your family readiness</h2>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-paper/80">
                Verify recovery details, add a loved one, create one core safety net, and add a backup person before using advanced tools.
              </p>
            </div>
            <Link href="/home/tools/checkup" className="shrink-0"><Button variant="secondary">Start checkup</Button></Link>
          </div>
        </section>

        <section className="mt-7">
          <h2 className="text-[18px] font-bold text-ink">What are you trying to do?</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {situations.map((situation) => (
              <Link
                key={situation.label}
                href={situation.href}
                className="rounded-full border border-line bg-white px-4 py-2 text-[14px] font-semibold text-ink hover:bg-ink/5"
              >
                {situation.label}
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {tools.map((tool) => (
            <Link key={tool.href} href={tool.href} className="card block p-6 transition-shadow hover:shadow-lift">
              <div className="flex items-start justify-between gap-4">
                <span className="text-[28px]" aria-hidden="true">{tool.emoji}</span>
                <span className="rounded-full bg-ink/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-subtle">{tool.eyebrow}</span>
              </div>
              <h2 className="mt-3 text-[19px] font-bold text-ink">{tool.title}</h2>
              <p className="mt-1 text-[15px] leading-relaxed text-body">{tool.body}</p>
              <p className="mt-4 border-t border-line pt-3 text-[13px] text-subtle"><strong className="text-ink">Best for:</strong> {tool.bestFor}</p>
            </Link>
          ))}
        </div>

        <section className="mt-8 rounded-2xl border border-marigold/50 bg-marigold/10 p-6">
          <h2 className="text-[18px] font-bold text-ink">Use these as test plans, not guaranteed financial protection</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-body">
            The current environment uses Stellar testnet. Paluwagan needs dispute and reminder controls; cash-out needs a licensed partner; and a missed check-in is not proof of an emergency.
          </p>
          <Link href="/home/trust" className="mt-3 inline-block text-[15px] font-semibold text-ink underline">Review trust and current limitations</Link>
        </section>
      </div>
    </AppShell>
  );
}
