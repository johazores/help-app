"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { authService } from "@/services/auth-service";
import { walletService } from "@/services/wallet-service";

type Step = "choose" | "creating" | "recovery" | "import" | "done";

/** Groups a 56-char recovery key into readable 4-character chunks. */
function chunked(key: string): string {
  return key.replace(/(.{4})/g, "$1 ").trim();
}

export default function WalletSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [savedConfirmed, setSavedConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importKey, setImportKey] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authService.isSignedIn()) router.replace("/sign-in");
  }, [router]);

  async function createWallet() {
    setError(null);
    setStep("creating");
    try {
      const result = await walletService.create();
      setRecoveryKey(result.recoveryKey);
      setStep("recovery");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't set up your wallet.");
      setStep("choose");
    }
  }

  async function importWallet() {
    setError(null);
    if (!importKey.trim()) {
      setError("Please paste your recovery key.");
      return;
    }
    setImporting(true);
    try {
      await walletService.import(importKey);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't import that wallet.");
      setImporting(false);
    }
  }

  function copyKey() {
    navigator.clipboard?.writeText(recoveryKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="container-page flex h-16 items-center">
        <Logo />
      </header>

      <div className="container-page flex flex-1 items-start justify-center py-8 sm:items-center">
        <div className="w-full max-w-lg">
          {/* Step 1: the two primary options */}
          {step === "choose" ? (
            <>
              <h1 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">
                Set up your wallet
              </h1>
              <p className="mt-2 text-[17px] text-body">
                Your wallet is where your money lives. This takes less than a minute.
              </p>

              {error ? (
                <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-[15px] font-medium text-danger" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="mt-7 space-y-4">
                <button
                  onClick={createWallet}
                  className="card block w-full p-6 text-left transition-shadow hover:shadow-lift"
                >
                  <span className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                    <span>
                      <span className="block text-[19px] font-bold text-ink">Create a new wallet</span>
                      <span className="mt-1 block text-[15px] text-body">
                        Best for most people. We&rsquo;ll set everything up for you in seconds.
                      </span>
                    </span>
                  </span>
                </button>

                <button
                  onClick={() => {
                    setError(null);
                    setStep("import");
                  }}
                  className="card block w-full p-6 text-left transition-shadow hover:shadow-lift"
                >
                  <span className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-marigold text-ink">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 3v12M12 15l-4-4M12 15l4-4M5 21h14" />
                      </svg>
                    </span>
                    <span>
                      <span className="block text-[19px] font-bold text-ink">
                        I already have a wallet
                      </span>
                      <span className="mt-1 block text-[15px] text-body">
                        Bring in a wallet you made before, using its recovery key.
                      </span>
                    </span>
                  </span>
                </button>
              </div>
            </>
          ) : null}

          {/* Creating: clear loading state */}
          {step === "creating" ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-line border-t-ink" aria-hidden="true" />
              <h1 className="mt-6 font-display text-[26px] font-bold text-ink">
                Setting up your wallet…
              </h1>
              <p className="mt-2 text-[16px] text-body">This usually takes a few seconds.</p>
            </div>
          ) : null}

          {/* Recovery key reveal */}
          {step === "recovery" ? (
            <>
              <h1 className="font-display text-[30px] font-bold text-ink sm:text-[34px]">
                Save your recovery key
              </h1>
              <p className="mt-2 text-[17px] text-body">
                This key can restore your wallet if you ever need it. Keep it somewhere safe and
                private — like a password manager or a written note at home.
              </p>

              <div className="card mt-6 p-5">
                <p className="break-all rounded-xl bg-paper px-4 py-4 text-center font-mono text-[15px] leading-relaxed tracking-wide text-ink">
                  {chunked(recoveryKey)}
                </p>
                <Button size="md" variant="secondary" fullWidth className="mt-4" onClick={copyKey}>
                  {copied ? "Copied" : "Copy key"}
                </Button>
              </div>

              <div className="mt-5 rounded-xl bg-ink/5 p-4 text-[14px] text-body">
                Don&rsquo;t worry — we also keep your wallet safe on our side, so you can always sign
                in with your mobile number and PIN. The key is your extra copy.
              </div>

              <label className="mt-5 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={savedConfirmed}
                  onChange={(e) => setSavedConfirmed(e.target.checked)}
                  className="mt-1 h-5 w-5 accent-[#0C3B3A]"
                />
                <span className="text-[16px] text-ink">I&rsquo;ve saved my recovery key somewhere safe.</span>
              </label>

              <Button fullWidth className="mt-5" disabled={!savedConfirmed} onClick={() => setStep("done")}>
                Continue
              </Button>
            </>
          ) : null}

          {/* Import */}
          {step === "import" ? (
            <>
              <button
                onClick={() => {
                  setError(null);
                  setStep("choose");
                }}
                className="text-[15px] font-semibold text-subtle hover:text-ink"
              >
                ← Back
              </button>
              <h1 className="mt-3 font-display text-[30px] font-bold text-ink sm:text-[34px]">
                Bring in your wallet
              </h1>
              <p className="mt-2 text-[17px] text-body">
                Paste the recovery key you saved when the wallet was made. It starts with{" "}
                <span className="font-mono font-semibold">S</span> and has 56 characters.
              </p>

              <div className="mt-6 space-y-5">
                <Field label="Your recovery key" error={error ?? undefined}>
                  {(id) => (
                    <textarea
                      id={id}
                      value={importKey}
                      onChange={(e) => setImportKey(e.target.value)}
                      placeholder="S…"
                      rows={3}
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full break-all rounded-xl border border-line bg-white px-4 py-3 font-mono text-[15px] text-ink placeholder:text-subtle/70 focus:border-ink"
                    />
                  )}
                </Field>
                <Button fullWidth loading={importing} onClick={importWallet}>
                  Bring in my wallet
                </Button>
                <p className="text-center text-[13px] text-subtle">
                  Your key is checked safely and never shown to anyone.
                </p>
              </div>
            </>
          ) : null}

          {/* Done */}
          {step === "done" ? (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-marigold">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12.5 10 17 19 7" stroke="#0C3B3A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="mt-5 font-display text-[28px] font-bold text-ink">Your wallet is ready</h1>
              <p className="mt-2 text-[17px] text-body">
                You can now add funds and set money aside for the people you love.
              </p>
              <Button className="mt-6" onClick={() => router.push("/home")}>
                Go to my home
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
