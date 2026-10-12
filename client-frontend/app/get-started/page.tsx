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

export default function GetStartedPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError(null);
    if (name.trim().length < 2 || !phone.trim() || pin.length !== 6) {
      setError("Please fill in your name, mobile number, and a 6-number PIN.");
      return;
    }
    if (pin !== pinConfirm) {
      setError("Your PINs don't match. Please type the same 6 numbers twice.");
      return;
    }
    setLoading(true);
    try {
      await authService.signUp({ name: name.trim(), phone, pin, email: email.trim() || undefined });
      router.push("/welcome");
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
          <h1 className="font-display text-[32px] font-bold text-ink">Create your account</h1>
          <p className="mt-2 text-[17px] text-body">It only takes a minute.</p>

          <form className="mt-8 space-y-5" onSubmit={submit} noValidate>
            <Field label="Your name">
              {(id, control) => (
                <Input
                  id={id}
                  {...control}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Juan dela Cruz"
                  autoComplete="name"
                  maxLength={60}
                  required
                />
              )}
            </Field>

            <Field label="Mobile number" hint="We use this to sign you in.">
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

            <Field label="Email (recommended)" hint="Used to recover your account if you forget your PIN.">
              {(id, control) => (
                <Input
                  id={id}
                  {...control}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              )}
            </Field>

            <Field label="Create a 6-number PIN" hint="You'll use this every time you sign in.">
              {(id, control) => (
                <PinInput id={id} {...control} value={pin} onValueChange={setPin} autoComplete="new-password" placeholder="••••••" required />
              )}
            </Field>

            <Field label="Type your PIN again">
              {(id, control) => (
                <PinInput id={id} {...control} value={pinConfirm} onValueChange={setPinConfirm} autoComplete="new-password" placeholder="••••••" required />
              )}
            </Field>

            {error ? (
              <p className="text-[15px] font-medium text-danger" role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" fullWidth loading={loading}>
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-[16px] text-subtle">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-semibold text-ink underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
