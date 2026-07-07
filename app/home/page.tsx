"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SafetyNetCard } from "@/components/safety-net-card";
import { BalanceCard } from "@/components/balance-card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authService } from "@/services/auth-service";
import { safetyNetService } from "@/services/safety-net-service";
import type { Profile, SafetyNet } from "@/services/types";

export default function HomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nets, setNets] = useState<SafetyNet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authService.isSignedIn()) {
      router.replace("/sign-in");
      return;
    }
    Promise.all([authService.me(), safetyNetService.list()])
      .then(([p, n]) => {
        setProfile(p);
        setNets(n);
      })
      .catch(() => {
        authService.signOut();
        router.replace("/sign-in");
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center py-20 text-ink">
          <Spinner className="h-7 w-7" />
        </div>
      </AppShell>
    );
  }

  const firstName = profile?.name.split(" ")[0] ?? "there";

  return (
    <AppShell>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[16px] text-subtle">Kumusta,</p>
          <h1 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">{firstName}</h1>
        </div>
        {nets.length > 0 ? (
          <Link href="/home/new" className="hidden sm:block">
            <Button size="md">Set aside money</Button>
          </Link>
        ) : null}
      </div>

      <div className="mt-6">
        <BalanceCard balance={profile?.balance ?? "0"} />
      </div>

      {nets.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <h2 className="font-display text-[24px] font-bold text-ink">Start your first safety net</h2>
          <p className="mx-auto mt-2 max-w-md text-[17px] text-body">
            Set aside money for someone you love. It stays yours — and reaches them if you ever
            can&rsquo;t check in.
          </p>
          <Link href="/home/new" className="mt-6 inline-block">
            <Button>Set aside money</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {nets.map((net) => (
            <SafetyNetCard key={net.id} net={net} />
          ))}
        </div>
      )}

      {nets.length > 0 ? (
        <Link href="/home/new" className="mt-6 block sm:hidden">
          <Button fullWidth>Set aside money</Button>
        </Link>
      ) : null}
    </AppShell>
  );
}
