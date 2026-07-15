import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-12">
      <div className="w-full max-w-lg text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="card mt-8 p-8 sm:p-10">
          <p className="text-[14px] font-bold uppercase tracking-wide text-subtle">Page not found</p>
          <h1 className="mt-3 font-display text-[30px] font-bold text-ink sm:text-[38px]">
            This Sagip page does not exist.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[16px] leading-relaxed text-body">
            The link may be outdated or incomplete. Return to your home screen to continue safely.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/home"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-ink px-5 py-3 text-[16px] font-semibold text-paper transition-opacity hover:opacity-90"
            >
              Go to home
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line px-5 py-3 text-[16px] font-semibold text-ink transition-colors hover:bg-ink/5"
            >
              Back to Sagip
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
