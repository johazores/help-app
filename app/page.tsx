import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const steps = [
  {
    n: "1",
    title: "Set money aside",
    body: "Choose an amount and the family member it's for. It's kept safe, and it stays completely yours.",
  },
  {
    n: "2",
    title: "Check in now and then",
    body: "Every so often, tap one button to say you're okay. Each time, the money stays in your hands.",
  },
  {
    n: "3",
    title: "Your family is covered",
    body: "If you ever can't check in, the money opens to your loved one — so they're never left waiting.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="container-page flex h-16 items-center justify-between">
        <Logo />
        <Link href="/sign-in" className="text-[15px] font-semibold text-ink hover:text-ink-soft">
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container-page grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-8">
          <div className="animate-fade-up">
            <p className="mb-4 inline-flex rounded-full bg-ink/5 px-4 py-1.5 text-[14px] font-semibold text-ink">
              For families who work far from home
            </p>
            <h1 className="font-display text-[40px] font-bold leading-[1.05] text-ink sm:text-[56px]">
              Money set aside for the people you love.
            </h1>
            <p className="mt-5 max-w-xl text-[19px] leading-relaxed text-body">
              As long as you check in, your savings stay yours. If something ever happens and you
              can&rsquo;t, the money reaches your family on its own. No paperwork, no waiting.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/get-started"
                className="inline-flex h-14 items-center justify-center rounded-xl bg-ink px-8 text-[17px] font-semibold text-paper hover:bg-ink-soft"
              >
                Get started
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex h-14 items-center justify-center rounded-xl border border-line bg-white px-8 text-[17px] font-semibold text-ink hover:bg-ink/5"
              >
                I already have an account
              </Link>
            </div>
            <p className="mt-4 text-[14px] text-subtle">Free to try. All you need is a mobile number.</p>
          </div>

          {/* Hero visual: a calm, reassuring "watching over" panel */}
          <div className="animate-fade-up">
            <div className="rounded-2xl bg-ink p-8 text-paper shadow-lift sm:p-10">
              <p className="text-[15px] text-marigold-soft">For Nanay Elena</p>
              <p className="mt-1 font-display text-[26px] font-bold">Monthly support</p>
              <p className="mt-6 font-display text-[46px] font-bold leading-none">15,000</p>
              <div className="mt-7">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/15">
                  <div className="h-full w-[62%] rounded-full bg-marigold" />
                </div>
                <p className="mt-3 text-[15px] text-paper/80">
                  Opens to your family in 11 days if you don&rsquo;t check in.
                </p>
              </div>
              <div className="mt-7 flex items-center gap-3 rounded-xl bg-white/10 p-4">
                <span className="h-2.5 w-2.5 shrink-0 animate-pulse-soft rounded-full bg-marigold" />
                <p className="text-[15px] text-paper/90">You checked in 2 days ago. Everything&rsquo;s fine.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works — a genuine sequence, so numbering is meaningful */}
      <section className="border-t border-line bg-white">
        <div className="container-page py-14 sm:py-18">
          <h2 className="max-w-2xl font-display text-[30px] font-bold text-ink sm:text-[38px]">
            Simple enough for anyone to use.
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="rounded-2xl border border-line bg-paper p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink font-display text-[19px] font-bold text-paper">
                  {s.n}
                </span>
                <h3 className="mt-5 text-[20px] font-bold text-ink">{s.title}</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-body">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink">
        <div className="container-page flex flex-col items-start gap-6 py-14 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="max-w-xl font-display text-[28px] font-bold text-paper sm:text-[34px]">
            Give your family one less thing to worry about.
          </h2>
          <Link
            href="/get-started"
            className="inline-flex h-14 shrink-0 items-center justify-center rounded-xl bg-marigold px-8 text-[17px] font-semibold text-ink hover:bg-marigold-deep hover:text-paper"
          >
            Get started
          </Link>
        </div>
      </section>

      <footer className="border-t border-line bg-paper">
        <div className="container-page flex flex-col items-center gap-2 py-8 text-center">
          <Logo />
          <p className="text-[14px] text-subtle">
            A safety net for your savings. Built for families who work far from home.
          </p>
        </div>
      </footer>
    </div>
  );
}
