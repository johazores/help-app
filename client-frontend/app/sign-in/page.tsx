"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PinInput } from "@/components/ui/pin-input";
import { Field } from "@/components/ui/field";
import { authService } from "@/services/auth-service";
import { loadErrorMessage } from "@/lib/api-errors";
import { takeReturnTo } from "@/lib/return-to";

export default function SignInPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError(null);
    if (!phone.trim() || pin.length !== 6) {
      setError("Please enter your mobile number and 6-number PIN.");
      return;
    }
    setLoading(true);
    try {
      await authService.signIn({ phone, pin });
      router.push(takeReturnTo());
    } catch (err) {
      setError(loadErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="container-page flex h-16 items-center">
        <Link href="/" aria-label="Sagip home">
          <Logo />
        </Link>
      </header>

      <main className="container-page flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md">
          <h1 className="font-display text-[32px] font-bold text-ink">Welcome back</h1>
          <p className="mt-2 text-[17px] text-body">Sign in to check in on your family.</p>

          <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
            <Field label="Mobile number">
              {(id, control) => (
                <Input
                  id={id}
                  {...control}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0917 123 4567"
                  inputMode="tel"
                  autoComplete="username"
                  required
                />
              )}
            </Field>

            <Field label="Your 6-number PIN">
              {(id, control) => (
                <PinInput
                  id={id}
                  {...control}
                  value={pin}
                  onValueChange={setPin}
                  autoComplete="current-password"
                  placeholder="••••••"
                  required
                />
              )}
            </Field>

            {error ? (
              <p className="text-[15px] font-medium text-danger" role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" fullWidth loading={loading}>
              Sign in
            </Button>

            <p className="text-center">
              <Link href="/forgot-pin" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-subtle underline hover:text-ink">
                Forgot your PIN?
              </Link>
            </p>
          </form>

          <p className="mt-4 text-center text-[16px] text-subtle">
            New here?{" "}
            <Link href="/get-started" className="font-semibold text-ink underline">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
