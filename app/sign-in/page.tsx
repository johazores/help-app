"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { authService } from "@/services/auth-service";

export default function SignInPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    if (!phone || pin.length !== 6) {
      setError("Please enter your mobile number and 6-number PIN.");
      return;
    }
    setLoading(true);
    try {
      await authService.signIn({ phone, pin });
      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
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

      <div className="container-page flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md">
          <h1 className="font-display text-[32px] font-bold text-ink">Welcome back</h1>
          <p className="mt-2 text-[17px] text-body">Sign in to check in on your family.</p>

          <div className="mt-8 space-y-5">
            <Field label="Mobile number">
              {(id) => (
                <Input
                  id={id}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0917 123 4567"
                  inputMode="tel"
                  autoComplete="tel"
                />
              )}
            </Field>

            <Field label="Your 6-number PIN" error={error ?? undefined}>
              {(id) => (
                <Input
                  id={id}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  inputMode="numeric"
                  className="tracking-[0.5em]"
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              )}
            </Field>

            <Button fullWidth loading={loading} onClick={submit}>
              Sign in
            </Button>
          </div>

          <p className="mt-6 text-center text-[16px] text-subtle">
            New here?{" "}
            <Link href="/get-started" className="font-semibold text-ink underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
