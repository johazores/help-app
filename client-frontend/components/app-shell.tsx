"use client";

import { useEffect, useRef, useState } from "react";
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
  ShieldIcon,
  SparkIcon,
  WalletIcon,
} from "@/components/ui/icons";
import { authService } from "@/services/auth-service";
import { adminAuthService } from "@/services/admin-auth-service";
import { configService } from "@/services/config-service";
import { healthService } from "@/services/health-service";
import type { AppConfig } from "@/services/types";

const baseNav = [
  { href: "/home", label: "Home", Icon: HomeIcon },
  { href: "/home/people", label: "Loved ones", Icon: PeopleIcon },
  { href: "/home/tools", label: "Family tools", Icon: SparkIcon },
  { href: "/home/wallets", label: "Wallets", Icon: WalletIcon },
  { href: "/home/guide", label: "How it works", Icon: GuideIcon },
  { href: "/home/trust", label: "Trust", Icon: ShieldIcon },
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
  const [isRoot, setIsRoot] = useState(false);
  const [serverDown, setServerDown] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(() => configService.peek());
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  // The drawer behaves like a modal: focus moves in, Escape closes it, and
  // focus returns to the menu button afterwards.
  useEffect(() => {
    if (!drawerOpen) return;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const opener = menuButton.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [drawerOpen]);

  useEffect(() => {
    setIsRoot(adminAuthService.isSignedIn());
  }, []);

  useEffect(() => {
    let cancelled = false;
    healthService
      .check()
      .then((h) => {
        if (!cancelled) setServerDown(!h.ok);
      })
      .catch(() => {
        if (!cancelled) setServerDown(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    configService
      .get()
      .then((value) => {
        if (!cancelled) setConfig(value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const nav = isRoot
    ? [...baseNav, { href: "/admin", label: "Admin", Icon: ShieldIcon }]
    : baseNav;

  const isTestnet = config ? config.network.toLowerCase() !== "public" : false;

  function signOut() {
    void authService.signOut().finally(() => router.push("/sign-in"));
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/home" aria-label="Sagip home">
              <Logo />
            </Link>
            {config ? (
              <Link
                href="/home/trust"
                className={`hidden rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide sm:inline-flex ${
                  isTestnet
                    ? "border-marigold/50 bg-marigold/10 text-ink"
                    : "border-sage/40 bg-sage/15 text-ink"
                }`}
              >
                {isTestnet ? "Preview · test money" : config.network}
              </Link>
            ) : null}
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {nav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(pathname, href) ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-[15px] font-semibold ${
                  isActive(pathname, href) ? "bg-ink/10 text-ink" : "text-subtle hover:text-ink"
                }`}
              >
                {label}
              </Link>
            ))}
            <button type="button" onClick={signOut} className="ml-2 min-h-11 px-2 text-[15px] font-semibold text-subtle hover:text-ink">
              Sign out
            </button>
          </nav>

          <button
            ref={menuButton}
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-ink lg:hidden"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            aria-controls="app-drawer"
            onClick={() => setDrawerOpen(true)}
          >
            <MenuIcon />
          </button>
        </div>
      </header>

      {serverDown ? (
        <div
          role="status"
          className="border-b border-danger/30 bg-danger/10 px-4 py-3 text-center text-[14px] font-medium text-ink"
        >
          Can&rsquo;t reach the server right now. Your data has not been refreshed. Please try again shortly.
        </div>
      ) : null}

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div aria-hidden="true" className="absolute inset-0 bg-ink/40" onClick={() => setDrawerOpen(false)} />
          <div
            id="app-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute right-0 top-0 flex h-full w-[82%] max-w-xs flex-col overflow-y-auto bg-paper p-6 shadow-lift animate-fade-up"
          >
            <div className="flex items-center justify-between">
              <div>
                <Logo />
                {config ? (
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-subtle">
                    {isTestnet ? "Preview · test money" : config.network}
                  </p>
                ) : null}
              </div>
              <button
                ref={closeButton}
                type="button"
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
                  aria-current={isActive(pathname, href) ? "page" : undefined}
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
              href="/home/deposit"
              onClick={() => setDrawerOpen(false)}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-line px-4 py-3.5 text-[17px] font-semibold text-ink hover:bg-ink/5"
            >
              Add funds
            </Link>

            <Link
              href="/home/new"
              onClick={() => setDrawerOpen(false)}
              className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-marigold px-4 py-3.5 text-[17px] font-semibold text-ink"
            >
              <PlusIcon className="h-5 w-5" /> Set aside money
            </Link>

            <button
              type="button"
              onClick={signOut}
              className="mt-auto rounded-xl border border-line px-4 py-3.5 text-[16px] font-semibold text-subtle hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </div>
      ) : null}

      <main className="container-page py-8 pb-28 sm:py-10 sm:pb-10">{children}</main>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          <TabLink href="/home" label="Home" active={isActive(pathname, "/home")}>
            <HomeIcon className="h-6 w-6" />
          </TabLink>
          <TabLink href="/home/people" label="Loved ones" active={isActive(pathname, "/home/people")}>
            <PeopleIcon className="h-6 w-6" />
          </TabLink>

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
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 flex-col items-center gap-1 py-1 ${active ? "text-ink" : "text-subtle"}`}
    >
      {children}
      <span className="text-[11px] font-semibold">{label}</span>
    </Link>
  );
}
