"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button, buttonClasses } from "@/components/ui/button";
import { PinInput } from "@/components/ui/pin-input";
import { PageSpinner } from "@/components/ui/spinner";
import { authService } from "@/services/auth-service";
import { paluwaganClient, type PaluwaganInvite } from "@/services/paluwagan-service";
import { loadErrorMessage } from "@/lib/api-errors";
import { formatMoney, intervalPhrase } from "@/lib/format";
import { rememberReturnTo } from "@/lib/return-to";

export default function PaluwaganInvitePage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params?.code ?? "";
  const [invite, setInvite] = useState<PaluwaganInvite | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [joining, setJoining] = useState(false);
  // Read after mount: the server render can't see this device's sign-in.
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(authService.isSignedIn());
    paluwaganClient
      .invite(code)
      .then(setInvite)
      .catch((err) => setLoadError(loadErrorMessage(err)));
  }, [code]);

  async function join(event: FormEvent) {
    event.preventDefault();
    if (joining) return;
    if (pin.length !== 6) return setError("Please enter your 6-number PIN.");
    setError(null);
    setJoining(true);
    try {
      const res = await paluwaganClient.join(code, pin);
      router.push(`/home/paluwagan/${res.id}`);
    } catch (err) {
      setError(loadErrorMessage(err));
      setJoining(false);
    }
  }

  // New members come straight back to this invite after signing up or in.
  const comeBackHere = () => rememberReturnTo(`/paluwagan/invite/${code}`);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="container-page flex h-16 items-center">
        <Link href="/" aria-label="Sagip home">
          <Logo />
        </Link>
      </header>
      <main className="container-page flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md">
          {!invite && !loadError ? <PageSpinner label="Opening the invite…" /> : null}

          {loadError && !invite ? (
            <div className="card p-8 text-center">
              <h1 className="font-display text-[24px] font-bold text-ink">This invite isn&rsquo;t working</h1>
              <p className="mt-2 text-[16px] text-body">{loadError} Please ask for the link again.</p>
            </div>
          ) : null}

          {invite ? (
            <div className="card overflow-hidden p-6 sm:p-8">
              <p className="text-[15px] text-subtle">{invite.ownerName} invited you to join</p>
              <h1 className="mt-1 break-words font-display text-[26px] font-bold leading-tight text-ink">{invite.name}</h1>

              <dl className="mt-5 space-y-2.5 rounded-xl bg-ink/5 p-5 text-[15px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-subtle">Each member gives</dt>
                  <dd className="text-right font-semibold text-ink">{formatMoney(invite.amount)} {intervalPhrase(invite.frequencyMinutes)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-subtle">Members so far</dt>
                  <dd className="font-semibold text-ink">{invite.memberCount} of up to {invite.maxMembers}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-subtle">Your turn to receive</dt>
                  <dd className="font-semibold text-ink">Round {invite.yourPositionIfJoined}</dd>
                </div>
              </dl>

              <p className="mt-4 text-[14px] leading-relaxed text-body">
                Each round, everyone sends their share straight to one member — and every member gets a
                turn. These rules lock when the group starts. Only join if you trust everyone here and
                can commit to every round.
              </p>

              {invite.status !== "DRAFT" ? (
                <p className="mt-5 rounded-xl bg-line/50 px-4 py-3 text-[15px] text-body">
                  This group has already started and can&rsquo;t take new members.
                </p>
              ) : signedIn ? (
                <form onSubmit={join} noValidate className="mt-5">
                  <label htmlFor="invite-pin" className="field-label">Confirm with your 6-number PIN</label>
                  <PinInput
                    id="invite-pin"
                    value={pin}
                    onValueChange={setPin}
                    autoComplete="current-password"
                    placeholder="••••••"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "invite-error" : undefined}
                  />
                  {error ? (
                    <p id="invite-error" className="mt-3 text-[15px] font-medium text-danger" role="alert">{error}</p>
                  ) : null}
                  <Button type="submit" fullWidth className="mt-4" loading={joining}>
                    I accept — join the group
                  </Button>
                </form>
              ) : (
                <div className="mt-5 space-y-3">
                  <Link href="/get-started" onClick={comeBackHere} className={buttonClasses({ fullWidth: true })}>
                    Create an account to join
                  </Link>
                  <Link href="/sign-in" onClick={comeBackHere} className={buttonClasses({ variant: "ghost", fullWidth: true })}>
                    I already have an account
                  </Link>
                  <p className="text-center text-[13px] text-subtle">You&rsquo;ll come straight back here to accept.</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
