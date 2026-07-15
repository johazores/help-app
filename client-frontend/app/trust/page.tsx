import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { TrustCenter } from "@/components/trust-center";

export default function PublicTrustPage() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line/70 bg-paper/90 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/" aria-label="Sagip home">
            <Logo />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[15px] font-semibold text-subtle hover:text-ink">
              Home
            </Link>
            <Link href="/sign-in" className="text-[15px] font-semibold text-ink hover:text-ink-soft">
              Sign in
            </Link>
          </div>
        </div>
      </header>
      <main className="container-page py-10 sm:py-14">
        <TrustCenter />
      </main>
    </div>
  );
}
