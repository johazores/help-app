"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authService } from "@/services/auth-service";
import { paluwaganClient, type PaluwaganInvite } from "@/services/paluwagan-service";
import { formatMoney } from "@/lib/format";

export default function PaluwaganInvitePage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params?.code ?? "";
  const [invite, setInvite] = useState<PaluwaganInvite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [joining, setJoining] = useState(false);
  const signedIn = authService.isSignedIn();

  useEffect(() => {
    paluwaganClient.invite(code).then(setInvite).catch((err) => setError(err instanceof Error ? err.message : "This invite doesn't work."));
  }, [code]);

  async function join() {
    setError(null);
    setJoining(true);
    try {
      const res = await paluwaganClient.join(code, pin);
      router.push(`/home/paluwagan/${res.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join.");
      setJoining(false);
    }
  }

  const freq = invite ? (invite.frequencyMinutes === 10080 ? "every week" : invite.frequencyMinutes === 43200 ? "every month" : "every minute (testing)") : "";

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="container-page flex h-16 items-center"><Logo /></header>
      <div className="container-page flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md">
          {!invite && !error ? (
            <div className="flex justify-center py-16 text-ink"><Spinner className="h-7 w-7" /></div>
          ) : null}

          {error && !invite ? (
            <div className="card p-8 text-center">
              <h1 className="font-display text-[24px] font-bold text-ink">This invite isn&rsquo;t working</h1>
              <p className="mt-2 text-[16px] text-body">Please ask for the link again.</p>
            </div>
          ) : null}

          {invite ? (
            <div className="card overflow-hidden p-6 sm:p-8">
              <p className="text-[15px] text-subtle">{invite.ownerName} invited you to join</p>
              <h1 className="mt-1 break-words font-display text-[26px] font-bold leading-tight text-ink">{invite.name}</h1>

              <dl className="mt-5 space-y-2.5 rounded-xl bg-ink/5 p-5 text-[15px]">
                <div className="flex justify-between gap-3"><dt className="text-subtle">Each member gives</dt><dd className="font-semibold text-ink">{formatMoney(invite.amount)} {freq}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-subtle">Members so far</dt><dd className="font-semibold text-ink">{invite.memberCount} of up to {invite.maxMembers}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-subtle">Your turn to receive</dt><dd className="font-semibold text-ink">Round {invite.yourPositionIfJoined}</dd></div>
              </dl>

              <p className="mt-4 text-[14px] leading-relaxed text-body">
                Each round, everyone sends their share straight to one member — and every member gets a
                turn. These rules lock when the group starts. Only join if you trust everyone here and
                can commit to every round.
              </p>

              {invite.status !== "DRAFT" ? (
                <p className="mt-5 rounded-xl bg-line/50 px-4 py-3 text-[15px] text-body">This group has already started and can&rsquo;t take new members.</p>
              ) : signedIn ? (
                <>
                  <Input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Your 6-number PIN" inputMode="numeric" className="mt-5 tracking-[0.5em]" />
                  {error ? <p className="mt-3 text-[15px] font-medium text-danger" role="alert">{error}</p> : null}
                  <Button fullWidth className="mt-4" loading={joining} onClick={join}>I accept — join the group</Button>
                </>
              ) : (
                <div className="mt-5 space-y-3">
                  <Link href="/get-started"><Button fullWidth>Create an account to join</Button></Link>
                  <Link href="/sign-in"><Button fullWidth variant="ghost">I already have an account</Button></Link>
                  <p className="text-center text-[13px] text-subtle">Then open this link again to accept.</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
