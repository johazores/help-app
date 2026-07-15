"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-12">
      <div className="w-full max-w-lg text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="card mt-8 p-8 sm:p-10">
          <p className="text-[14px] font-bold uppercase tracking-wide text-subtle">Something went wrong</p>
          <h1 className="mt-3 font-display text-[28px] font-bold text-ink sm:text-[34px]">
            Sagip could not finish loading this screen.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[16px] leading-relaxed text-body">
            Your data has not been changed. Try the screen again, or return home and continue from there.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={reset}>Try again</Button>
            <Link
              href="/home"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line px-5 py-3 text-[16px] font-semibold text-ink transition-colors hover:bg-ink/5"
            >
              Return home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
