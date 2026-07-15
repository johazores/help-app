import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const steps = [
  {
    n: "1",
    title: "Choose a family plan",
    body: "Pick who the money is for, the amount, and the check-in rules you want to test.",
  },
  {
    n: "2",
    title: "Check in now and then",
    body: "Tap one button to renew the timer. Every action is recorded so the family can understand what happened.",
  },
  {
    n: "3",
    title: "Prepare clear claim instructions",
    body: "Give your loved one a private claim link or card and add a backup person before an emergency happens.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="container-page flex h-16 items-center justify-between">
        <Logo />
        <div className="flex items-center gap-4">
          <Link href="/trust" className="text-[15px] font-semibold text-subtle hover:text-ink">
            Trust &amp; safety
          </Link>
          <Link href="/sign-in" className="text-[15px] font-semibold text-ink hover:text-ink-soft">
            Sign in
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="container-page grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-8">
          <div className="animate-fade-up">
            <p className="mb-4 inline-flex rounded-full border border-marigold/40 bg-marigold/10 px-4 py-1.5 text-[14px] font-semibold text-ink">
              Testnet preview for families who work far from home
            </p>
            <h1 className="font-display text-[40px] font-bold leading-[1.05] text-ink sm:text-[56px]">
              A family money plan people can understand before an emergency.
            </h1>
            <p className="mt-5 max-w-xl text-[19px] leading-relaxed text-body">
              Test how check-ins, family claim instructions, gifts, tuition plans, and shared savings can work
              together. The current version uses Stellar testnet and does not hold real money.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/get-started"
                className="inline-flex h-14 items-center justify-center rounded-xl bg-ink px-8 text-[17px] font-semibold text-paper hover:bg-ink-soft"
              >
                Try the preview
              </Link>
              <Link
                href="/trust"
                className="inline-flex h-14 items-center justify-center rounded-xl border border-line bg-white px-8 text-[17px] font-semibold text-ink hover:bg-ink/5"
              >
                See how trust works
              </Link>
            </div>
            <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-subtle">
              No bank, GCash, Maya, insurance, or licensed cash-out partner is connected yet. Review the trust
              page before testing.
            </p>
          </div>

          <div className="animate-fade-up">
            <div className="rounded-2xl bg-ink p-8 text-paper shadow-lift sm:p-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[15px] text-marigold-soft">For Nanay Elena</p>
                  <p className="mt-1 font-display text-[26px] font-bold">Monthly support</p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-paper/80">
                  Demo
                </span>
              </div>
              <p className="mt-6 font-display text-[46px] font-bold leading-none">15,000</p>
              <div className="mt-7">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/15">
                  <div className="h-full w-[62%] rounded-full bg-marigold" />
                </div>
                <p className="mt-3 text-[15px] text-paper/80">
                  The test claim opens in 11 days unless the sender checks in.
                </p>
              </div>
              <div className="mt-7 flex items-center gap-3 rounded-xl bg-white/10 p-4">
                <span className="h-2.5 w-2.5 shrink-0 animate-pulse-soft rounded-full bg-marigold" />
                <p className="text-[15px] text-paper/90">Last test check-in: 2 days ago.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-white">
        <div className="container-page py-14 sm:py-18">
          <h2 className="max-w-2xl font-display text-[30px] font-bold text-ink sm:text-[38px]">
            Start with a plan, not a complicated wallet.
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
          <div>
            <h2 className="max-w-xl font-display text-[28px] font-bold text-paper sm:text-[34px]">
              Build a family plan everyone understands.
            </h2>
            <p className="mt-2 max-w-xl text-[15px] text-paper/70">
              Use fictional test amounts while the regulated production path is being completed.
            </p>
          </div>
          <Link
            href="/get-started"
            className="inline-flex h-14 shrink-0 items-center justify-center rounded-xl bg-marigold px-8 text-[17px] font-semibold text-ink hover:bg-marigold-deep hover:text-paper"
          >
            Try the preview
          </Link>
        </div>
      </section>

      <footer className="border-t border-line bg-paper">
        <div className="container-page flex flex-col items-center gap-3 py-8 text-center">
          <Logo />
          <p className="text-[14px] text-subtle">
            A testnet family-finance product preview. Not a bank, insurer, or legal estate plan.
          </p>
          <Link href="/trust" className="text-[14px] font-semibold text-ink underline">
            Trust, custody, and current limitations
          </Link>
        </div>
      </footer>
    </div>
  );
}
