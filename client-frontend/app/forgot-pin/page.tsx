"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { authService } from "@/services/auth-service";

type Step = "phone" | "code" | "done";

export default function ForgotPinPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPinConfirm, setNewPinConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    setError(null);
    if (!phone) {
      setError("Please enter your mobile number.");
      return;
    }
    setLoading(true);
    try {
      await authService.forgotPin(phone);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function reset() {
    setError(null);
    if (code.length !== 6) {
      setError("Please enter the 6-number code from your email.");
      return;
    }
    if (newPin.length !== 6) {
      setError("Your new PIN must be 6 numbers.");
      return;
    }
    if (newPin !== newPinConfirm) {
      setError("Your PINs don't match. Please type the same 6 numbers twice.");
      return;
    }
    setLoading(true);
    try {
      await authService.resetPin(phone, code, newPin);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
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
          {step === "phone" ? (
            <>
              <h1 className="font-display text-[32px] font-bold text-ink">Forgot your PIN?</h1>
              <p className="mt-2 text-[17px] text-body">
                No problem. We&rsquo;ll email a code to the address on your account.
              </p>
              <div className="mt-8 space-y-5">
                <Field label="Your mobile number" error={error ?? undefined}>
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
                <Button fullWidth loading={loading} onClick={sendCode}>
                  Email me a code
                </Button>
              </div>
            </>
          ) : null}

          {step === "code" ? (
            <>
              <h1 className="font-display text-[32px] font-bold text-ink">Check your email</h1>
              <p className="mt-2 text-[17px] text-body">
                If that number has an account with a verified email, a 6-number code is on its way.
                It works for 15 minutes.
              </p>
              <div className="mt-8 space-y-5">
                <Field label="The code from your email">
                  {(id) => (
                    <Input
                      id={id}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      inputMode="numeric"
                      className="tracking-[0.4em]"
                    />
                  )}
                </Field>
                <Field label="Your new 6-number PIN">
                  {(id) => (
                    <Input
                      id={id}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="••••••"
                      inputMode="numeric"
                      className="tracking-[0.5em]"
                    />
                  )}
                </Field>
                <Field label="Type your new PIN again" error={error ?? undefined}>
                  {(id) => (
                    <Input
                      id={id}
                      value={newPinConfirm}
                      onChange={(e) => setNewPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="••••••"
                      inputMode="numeric"
                      className="tracking-[0.5em]"
                    />
                  )}
                </Field>
                <Button fullWidth loading={loading} onClick={reset}>
                  Set my new PIN
                </Button>
                <button onClick={sendCode} className="w-full text-[15px] font-semibold text-subtle underline hover:text-ink">
                  Send a new code
                </button>
              </div>
            </>
          ) : null}

          {step === "done" ? (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-marigold">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12.5 10 17 19 7" stroke="#0C3B3A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="mt-5 font-display text-[28px] font-bold text-ink">PIN changed</h1>
              <p className="mt-2 text-[17px] text-body">
                For safety, every device has been signed out. Sign in with your new PIN.
              </p>
              <Button className="mt-6" onClick={() => router.push("/sign-in")}>
                Sign in
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
