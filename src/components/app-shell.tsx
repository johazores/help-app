"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { authService } from "@/services/auth-service";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  function signOut() {
    authService.signOut();
    router.push("/sign-in");
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/85 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/home" aria-label="Sagip home">
            <Logo />
          </Link>
          <button
            onClick={signOut}
            className="text-[15px] font-semibold text-subtle hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="container-page py-8 sm:py-10">{children}</main>
    </div>
  );
}
