"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { authService } from "@/services/auth-service";

export default function GetStartedPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    if (!name || !phone || pin.length !== 6) {
      setError("Please fill in every box. Your PIN needs 6 numbers.");
      return;
    }
    setLoading(true);
    try {
      await authService.signUp({ name, phone, pin });
      router.push("/welcome");
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
          <h1 className="font-display text-[32px] font-bold text-ink">Create your account</h1>
          <p className="mt-2 text-[17px] text-body">It only takes a minute.</p>

          <div className="mt-8 space-y-5">
            <Field label="Your name">
              {(id) => (
                <Input
                  id={id}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Juan dela Cruz"
                  autoComplete="name"
                />
              )}
            </Field>

            <Field label="Mobile number" hint="We use this to sign you in.">
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

            <Field label="Create a 6-number PIN" hint="You'll use this every time you sign in." error={error ?? undefined}>
              {(id) => (
                <Input
                  id={id}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  inputMode="numeric"
                  className="tracking-[0.5em]"
                />
              )}
            </Field>

            <Button fullWidth loading={loading} onClick={submit}>
              Create account
            </Button>
          </div>

          <p className="mt-6 text-center text-[16px] text-subtle">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-semibold text-ink underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
