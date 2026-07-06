"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import {
  AccountIcon,
  CloseIcon,
  GuideIcon,
  HomeIcon,
  MenuIcon,
  PeopleIcon,
  PlusIcon,
} from "@/components/ui/icons";
import { authService } from "@/services/auth-service";

const nav = [
  { href: "/home", label: "Home", Icon: HomeIcon },
  { href: "/home/people", label: "Loved ones", Icon: PeopleIcon },
  { href: "/home/guide", label: "How it works", Icon: GuideIcon },
  { href: "/home/account", label: "Account", Icon: AccountIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/home") return pathname === "/home";
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [drawerOpen, setDrawerOpen] = useState(false);

  function signOut() {
    authService.signOut();
    router.push("/sign-in");
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/home" aria-label="Sagip home">
            <Logo />
          </Link>

          {/* Desktop links */}
          <nav className="hidden items-center gap-1 sm:flex">
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-2 text-[15px] font-semibold ${
                  isActive(pathname, href) ? "bg-ink/10 text-ink" : "text-subtle hover:text-ink"
                }`}
              >
                {label}
              </Link>
            ))}
            <button onClick={signOut} className="ml-2 text-[15px] font-semibold text-subtle hover:text-ink">
              Sign out
            </button>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="flex h-11 w-11 items-center justify-center rounded-lg text-ink sm:hidden"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
          >
            <MenuIcon />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 sm:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-[82%] max-w-xs flex-col bg-paper p-6 shadow-lift animate-fade-up">
            <div className="flex items-center justify-between">
              <Logo />
              <button
                className="flex h-11 w-11 items-center justify-center rounded-lg text-ink"
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>

            <nav className="mt-8 flex flex-col gap-1">
              {nav.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-[17px] font-semibold ${
                    isActive(pathname, href) ? "bg-ink text-paper" : "text-ink hover:bg-ink/5"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  {label}
                </Link>
              ))}
            </nav>

            <Link
              href="/home/new"
              onClick={() => setDrawerOpen(false)}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-marigold px-4 py-3.5 text-[17px] font-semibold text-ink"
            >
              <PlusIcon className="h-5 w-5" /> Set aside money
            </Link>

            <button
              onClick={signOut}
              className="mt-auto rounded-xl border border-line px-4 py-3.5 text-[16px] font-semibold text-subtle hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </div>
      ) : null}

      {/* Main — extra bottom padding on mobile so the tab bar never covers content */}
      <main className="container-page py-8 pb-28 sm:py-10 sm:pb-10">{children}</main>

      {/* Fixed bottom tab bar (mobile only), wallet-app style */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          <TabLink href="/home" label="Home" active={isActive(pathname, "/home")}>
            <HomeIcon className="h-6 w-6" />
          </TabLink>
          <TabLink href="/home/people" label="Loved ones" active={isActive(pathname, "/home/people")}>
            <PeopleIcon className="h-6 w-6" />
          </TabLink>

          {/* Center action */}
          <Link href="/home/new" aria-label="Set aside money" className="flex flex-col items-center">
            <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-paper shadow-lift">
              <PlusIcon className="h-7 w-7" />
            </span>
            <span className="mt-1 text-[11px] font-semibold text-ink">Set aside</span>
          </Link>

          <TabLink href="/home/guide" label="Guide" active={isActive(pathname, "/home/guide")}>
            <GuideIcon className="h-6 w-6" />
          </TabLink>
          <TabLink href="/home/account" label="Account" active={isActive(pathname, "/home/account")}>
            <AccountIcon className="h-6 w-6" />
          </TabLink>
        </div>
      </nav>
    </div>
  );
}

function TabLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 py-1 ${active ? "text-ink" : "text-subtle"}`}
    >
      {children}
      <span className="text-[11px] font-semibold">{label}</span>
    </Link>
  );
}
