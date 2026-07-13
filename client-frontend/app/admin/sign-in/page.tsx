"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { adminAuthService } from "@/services/admin-auth-service";

export default function AdminSignInPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    if (!identity || !password) {
      setError("Please enter your username (or email) and password.");
      return;
    }
    setLoading(true);
    try {
      await adminAuthService.signIn(identity, password);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <header className="container-page flex h-16 items-center">
        <Logo tone="paper" />
      </header>

      <div className="container-page flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-md rounded-2xl bg-paper p-8 shadow-lift">
          <p className="text-[13px] font-bold uppercase tracking-wider text-marigold-deep">
            Administration
          </p>
          <h1 className="mt-1 font-display text-[28px] font-bold text-ink">Admin sign in</h1>
          <p className="mt-1 text-[15px] text-subtle">
            This area is separate from Sagip accounts.
          </p>

          <div className="mt-7 space-y-5">
            <Field label="Username or email">
              {(id) => (
                <Input
                  id={id}
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  placeholder="root"
                  autoComplete="username"
                />
              )}
            </Field>
            <Field label="Password" error={error ?? undefined}>
              {(id) => (
                <Input
                  id={id}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              )}
            </Field>
            <Button fullWidth loading={loading} onClick={submit}>
              Sign in
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
