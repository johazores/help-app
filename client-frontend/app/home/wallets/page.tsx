"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { authService } from "@/services/auth-service";
import { walletService } from "@/services/wallet-service";
import { handleProtectedLoadError, loadErrorMessage } from "@/lib/api-errors";
import { LoadErrorBanner } from "@/components/load-error-banner";
import type { WalletInfo } from "@/services/types";

function shortAddress(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-6)}`;
}

function chunked(key: string): string {
  return key.replace(/(.{4})/g, "$1 ").trim();
}

export default function WalletsPage() {
  const router = useRouter();
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmSwitch, setConfirmSwitch] = useState<WalletInfo | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [revealFor, setRevealFor] = useState<WalletInfo | null>(null);
  const [revealPin, setRevealPin] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealBusy, setRevealBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<{ text: string; bad?: boolean } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setWallets(await walletService.list());
    } catch (err) {
      if (handleProtectedLoadError(err, router, () => authService.signOut()) !== "error") return;
      setLoadError(loadErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!authService.isSignedIn()) {
      router.replace("/sign-in");
      return;
    }
    void load();
  }, [router, load]);

  function say(text: string, bad = false) {
    setNotice({ text, bad });
    setTimeout(() => setNotice(null), 5000);
  }

  async function doSwitch(wallet: WalletInfo) {
    setConfirmSwitch(null);
    setBusyId(wallet.id);
    try {
      await walletService.activate(wallet.id);
      setWallets((prev) => prev.map((w) => ({ ...w, active: w.id === wallet.id })));
      say(`“${wallet.name}” is now your active wallet.`);
    } catch (err) {
      say(err instanceof Error ? err.message : "Couldn't switch wallets.", true);
    } finally {
      setBusyId(null);
    }
  }

  async function saveRename(wallet: WalletInfo) {
    const name = renameValue.trim();
    if (name.length < 1) return say("Please enter a wallet name.", true);
    setBusyId(wallet.id);
    try {
      await walletService.rename(wallet.id, name);
      setWallets((prev) => prev.map((w) => (w.id === wallet.id ? { ...w, name } : w)));
      setRenamingId(null);
      say("Wallet renamed.");
    } catch (err) {
      say(err instanceof Error ? err.message : "Couldn't rename.", true);
    } finally {
      setBusyId(null);
    }
  }

  async function doReveal() {
    if (!revealFor) return;
    if (revealPin.length !== 6) return say("Please enter your 6-number PIN.", true);
    setRevealBusy(true);
    try {
      const res = await walletService.reveal(revealFor.id, revealPin);
      setRevealedKey(res.recoveryKey);
    } catch (err) {
      say(err instanceof Error ? err.message : "Couldn't show the key.", true);
    } finally {
      setRevealBusy(false);
    }
  }

  function closeReveal() {
    setRevealFor(null);
    setRevealPin("");
    setRevealedKey(null);
    setCopied(false);
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
      {loadError ? <LoadErrorBanner message={loadError} onRetry={() => void load()} /> : null}
      <h1 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">Your wallets</h1>
      <p className="mt-2 max-w-xl text-[17px] text-body">
        The <strong>active</strong> wallet is the one used when you add funds or set money aside.
      </p>

      {notice ? (
        <p
          role="status"
          className={`mt-4 max-w-xl rounded-xl px-4 py-3 text-[15px] font-medium ${
            notice.bad ? "bg-danger/10 text-danger" : "bg-sage/15 text-ink"
          }`}
        >
          {notice.text}
        </p>
      ) : null}

      <div className="mt-6 max-w-xl space-y-4">
        {wallets.map((w) => (
          <div key={w.id} className={`card p-5 ${w.active ? "border-2 border-ink" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {renamingId === w.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="h-11 max-w-[220px] text-[16px]"
                      maxLength={40}
                      autoFocus
                    />
                    <Button size="md" loading={busyId === w.id} onClick={() => saveRename(w)}>
                      Save
                    </Button>
                    <Button size="md" variant="ghost" onClick={() => setRenamingId(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <p className="truncate text-[19px] font-bold text-ink">{w.name}</p>
                )}
                <p className="mt-1 font-mono text-[13px] text-subtle">{shortAddress(w.address)}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                {w.active ? <Badge tone="received">Active</Badge> : null}
                {w.imported ? <Badge tone="neutral">Brought in</Badge> : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-3">
              {!w.active ? (
                <button
                  onClick={() => setConfirmSwitch(w)}
                  disabled={busyId !== null}
                  className="text-[15px] font-semibold text-ink underline hover:text-ink-soft"
                >
                  Make active
                </button>
              ) : null}
              <button
                onClick={() => {
                  setRenamingId(w.id);
                  setRenameValue(w.name);
                }}
                className="text-[15px] font-semibold text-subtle hover:text-ink"
              >
                Rename
              </button>
              <button
                onClick={() => setRevealFor(w)}
                className="text-[15px] font-semibold text-subtle hover:text-ink"
              >
                Show recovery key
              </button>
            </div>
          </div>
        ))}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Link href="/wallet-setup" className="flex-1">
            <Button fullWidth variant="ghost" size="md">
              + Add another wallet
            </Button>
          </Link>
        </div>
      </div>

      {/* Switch confirmation */}
      {confirmSwitch ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="card w-full max-w-md p-6">
            <h2 className="font-display text-[22px] font-bold text-ink">Switch wallets?</h2>
            <p className="mt-2 text-[16px] text-body">
              New funds and safety nets will use <strong>{confirmSwitch.name}</strong>. Your existing
              safety nets keep working exactly as before.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row-reverse">
              <Button fullWidth onClick={() => void doSwitch(confirmSwitch)}>
                Yes, switch
              </Button>
              <Button fullWidth variant="ghost" onClick={() => setConfirmSwitch(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Recovery key modal (PIN-guarded) */}
      {revealFor ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="card w-full max-w-md p-6">
            <h2 className="font-display text-[22px] font-bold text-ink">
              Recovery key — {revealFor.name}
            </h2>
            {!revealedKey ? (
              <>
                <p className="mt-2 text-[15px] text-body">
                  Enter your PIN to show this wallet&rsquo;s recovery key. Never share it with anyone.
                </p>
                <Input
                  value={revealPin}
                  onChange={(e) => setRevealPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  inputMode="numeric"
                  className="mt-4 tracking-[0.5em]"
                  autoFocus
                />
                <div className="mt-4 flex flex-col gap-3 sm:flex-row-reverse">
                  <Button fullWidth loading={revealBusy} onClick={doReveal}>
                    Show key
                  </Button>
                  <Button fullWidth variant="ghost" onClick={closeReveal}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 break-all rounded-xl bg-paper px-4 py-4 text-center font-mono text-[14px] leading-relaxed text-ink">
                  {chunked(revealedKey)}
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row-reverse">
                  <Button
                    fullWidth
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard?.writeText(revealedKey);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? "Copied" : "Copy key"}
                  </Button>
                  <Button fullWidth variant="ghost" onClick={closeReveal}>
                    Done
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
