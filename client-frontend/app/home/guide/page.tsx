"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

const steps = [
  {
    n: "1",
    title: "Add a loved one",
    body: "Tell us who you want to look after — a parent, a child, a sibling. You can add as many people as you like.",
  },
  {
    n: "2",
    title: "Set money aside for them",
    body: "Pick one of your loved ones, give it a short name like “Monthly support,” and choose an amount. The money is kept safe, and it stays completely yours.",
  },
  {
    n: "3",
    title: "Check in every now and then",
    body: "You choose how often — every week, every month, and so on. Each time, just tap “I’m okay.” That keeps the money in your hands and starts the timer again.",
  },
  {
    n: "4",
    title: "Your family is always covered",
    body: "If you ever miss your check-in — you’re unwell, you lose your phone, or worse — the money opens to the loved one you chose. They don’t need an account. They just tap a link and receive it.",
  },
  {
    n: "5",
    title: "You’re always in control",
    body: "Change your mind? You can take the money back at any time while it’s still yours. Nothing happens without you.",
  },
];

const faqs = [
  {
    q: "Is my money safe?",
    a: "Yes. The money is set aside and can only go to you or the loved one you chose — no one else. You can take it back whenever you like.",
  },
  {
    q: "What if I forget to check in?",
    a: "That’s the whole point. If you can’t check in, the money simply opens to your family, so they’re never left waiting.",
  },
  {
    q: "Does my family need to sign up?",
    a: "No. You send them a link. When the money is ready, they open the link and tap one button to receive it.",
  },
  {
    q: "Can anyone change the rules after I set money aside?",
    a: "No. The rules — who receives it and when — are recorded permanently when you confirm. Not even Sagip can redirect the money.",
  },
  {
    q: "What if Sagip shuts down?",
    a: "Your funds live on Stellar, not on our servers. Export your wallet recovery key anytime from Wallets. Money in an open safety net can still be received by your family using their link.",
  },
];

export default function GuidePage() {
  return (
    <AppShell>
      <h1 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">How Sagip works</h1>
      <p className="mt-2 max-w-2xl text-[17px] text-body">
        A simple way to make sure the people you love are taken care of, even from far away.
      </p>

      <ol className="mt-8 max-w-2xl space-y-4">
        {steps.map((s) => (
          <li key={s.n} className="card flex gap-5 p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink font-display text-[19px] font-bold text-paper">
              {s.n}
            </span>
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
        <Link href="/home/new">
          <Button>Set aside money now</Button>
        </Link>
      </div>
    </AppShell>
  );
}
