"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";

const tools = [
  { href: "/home/tools/gift", emoji: "🎁", title: "Send a gift", body: "Send money now, or set it to open on a special date — a birthday, graduation, or Pasko." },
  { href: "/home/tools/gift?mode=parts", emoji: "🎓", title: "Tuition plan", body: "Set aside school money that opens term by term, on the dates you choose." },
  { href: "/home/tools/split", emoji: "👨‍👩‍👧", title: "Split a safety net", body: "One amount, several loved ones — each gets their own share if you can't check in." },
  { href: "/home/tools/pots", emoji: "🏺", title: "Savings goals", body: "Save toward something — a roof repair, a celebration — and watch it fill up." },
  { href: "/home/new?preset=abuloy", emoji: "🕯️", title: "Abuloy fund", body: "A safety net set up with care for life's hardest day, so your family is never left short." },
];

export default function ToolsPage() {
  return (
    <AppShell>
      <h1 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">Family tools</h1>
      <p className="mt-2 max-w-xl text-[17px] text-body">
        More ways to look after the people you love. Your safety nets stay exactly as they are.
      </p>

      <div className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
        {tools.map((t) => (
          <Link key={t.href} href={t.href} className="card block p-6 transition-shadow hover:shadow-lift">
            <span className="text-[28px]" aria-hidden="true">{t.emoji}</span>
            <h2 className="mt-3 text-[19px] font-bold text-ink">{t.title}</h2>
            <p className="mt-1 text-[15px] leading-relaxed text-body">{t.body}</p>
          </Link>
        ))}

        <div className="card p-6 opacity-70">
          <div className="flex items-start justify-between">
            <span className="text-[28px]" aria-hidden="true">🔄</span>
            <span className="rounded-full bg-marigold/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-marigold-deep">Coming soon</span>
          </div>
          <h2 className="mt-3 text-[19px] font-bold text-ink">Paluwagan</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-body">
            A rotating family fund where everyone chips in and takes turns receiving. This needs the
            whole group on Sagip, so we're building it carefully.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
