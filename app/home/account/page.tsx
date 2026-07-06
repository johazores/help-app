"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authService } from "@/services/auth-service";
import type { Profile } from "@/services/types";

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authService.isSignedIn()) {
      router.replace("/sign-in");
      return;
    }
    authService
      .me()
      .then(setProfile)
      .catch(() => {
        authService.signOut();
        router.replace("/sign-in");
      })
      .finally(() => setLoading(false));
  }, [router]);

  function signOut() {
    authService.signOut();
    router.push("/sign-in");
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center py-20 text-ink">
          <Spinner className="h-7 w-7" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">Account</h1>

      <div className="mt-8 max-w-xl space-y-4">
        <div className="card p-6">
          <p className="text-[15px] text-subtle">Name</p>
          <p className="mt-1 text-[19px] font-semibold text-ink">{profile?.name}</p>
        </div>
        <div className="card p-6">
          <p className="text-[15px] text-subtle">Mobile number</p>
          <p className="mt-1 text-[19px] font-semibold text-ink">{profile?.phone}</p>
        </div>

        <Link href="/home/guide" className="block">
          <div className="card flex items-center justify-between p-6 hover:shadow-lift">
            <div>
              <p className="text-[17px] font-semibold text-ink">How Sagip works</p>
              <p className="text-[15px] text-subtle">A quick, friendly walkthrough</p>
            </div>
            <span className="text-[22px] text-subtle">→</span>
          </div>
        </Link>

        <Button variant="ghost" onClick={signOut} fullWidth>
          Sign out
        </Button>
      </div>
    </AppShell>
  );
}
