"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PinInput } from "@/components/ui/pin-input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { PageSpinner } from "@/components/ui/spinner";
import { LoadErrorBanner } from "@/components/load-error-banner";
import { NoticeBanner } from "@/components/notice-banner";
import { authService } from "@/services/auth-service";
import { walletService } from "@/services/wallet-service";
import { handleProtectedLoadError, loadErrorMessage } from "@/lib/api-errors";
import { chunked, formatDate } from "@/lib/format";
import { useCopy } from "@/lib/use-copy";
import { useNotice } from "@/lib/use-notice";
import type { WalletInfo } from "@/services/types";

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
  const [revealError, setRevealError] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealBusy, setRevealBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { notice, say } = useNotice();
  const { copy, copied, failed: copyFailed } = useCopy();

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

  async function doSwitch(wallet: WalletInfo) {
    setBusyId(wallet.id);
    try {
      await walletService.activate(wallet.id);
      setWallets((prev) => prev.map((w) => ({ ...w, active: w.id === wallet.id })));
      setConfirmSwitch(null);
      say(`“${wallet.name}” is now your active wallet.`);
    } catch (err) {
      setConfirmSwitch(null);
      say(loadErrorMessage(err), true);
    } finally {
      setBusyId(null);
    }
  }

  async function saveRename(event: FormEvent, wallet: WalletInfo) {
    event.preventDefault();
    const name = renameValue.trim();
    if (name.length < 1) return say("Please enter a wallet name.", true);
    setBusyId(wallet.id);
    try {
      await walletService.rename(wallet.id, name);
      setWallets((prev) => prev.map((w) => (w.id === wallet.id ? { ...w, name } : w)));
      setRenamingId(null);
      say("Wallet renamed.");
    } catch (err) {
      say(loadErrorMessage(err), true);
    } finally {
      setBusyId(null);
    }
  }

  async function doReveal(event: FormEvent) {
    event.preventDefault();
    if (!revealFor || revealBusy) return;
    if (revealPin.length !== 6) return setRevealError("Please enter your 6-number PIN.");
    setRevealBusy(true);
    setRevealError(null);
    try {
      const res = await walletService.reveal(revealFor.id, revealPin);
      setRevealedKey(res.recoveryKey);
      setRevealPin("");
    } catch (err) {
      setRevealError(loadErrorMessage(err));
    } finally {
      setRevealBusy(false);
    }
  }

  function closeReveal() {
    setRevealFor(null);
    setRevealPin("");
    setRevealError(null);
    setRevealedKey(null);
  }

  if (loading) {
    return (
      <AppShell>
        <PageSpinner />
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

      <NoticeBanner notice={notice} className="mt-4 max-w-xl" />

      <ul className="mt-6 max-w-xl space-y-4">
        {wallets.map((w) => (
          <li key={w.id} className={`card p-5 ${w.active ? "border-2 border-ink" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {renamingId === w.id ? (
                  <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => saveRename(e, w)}>
                    <label htmlFor={`rename-${w.id}`} className="sr-only">New name for {w.name}</label>
                    <Input
                      id={`rename-${w.id}`}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="h-11 max-w-[220px] text-[16px]"
                      maxLength={40}
                      autoFocus
                    />
                    <Button type="submit" size="md" loading={busyId === w.id}>
                      Save
                    </Button>
                    <Button size="md" variant="ghost" onClick={() => setRenamingId(null)}>
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <h2 className="truncate text-[19px] font-bold text-ink">{w.name}</h2>
                )}
                <p className="mt-1 text-[14px] text-subtle">
                  {w.imported ? "Restored" : "Created"} {formatDate(w.createdAt)}
                </p>
              </div>
              {w.active ? <Badge tone="received">Active</Badge> : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-3 border-t border-line pt-2">
              {!w.active ? (
                <button
                  type="button"
                  onClick={() => setConfirmSwitch(w)}
                  disabled={busyId !== null}
                  className="min-h-11 px-1 text-[15px] font-semibold text-ink underline hover:text-ink-soft"
                >
                  Make active
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setRenamingId(w.id);
                  setRenameValue(w.name);
                }}
                className="min-h-11 px-1 text-[15px] font-semibold text-subtle hover:text-ink"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={() => setRevealFor(w)}
                className="min-h-11 px-1 text-[15px] font-semibold text-subtle hover:text-ink"
              >
                Show recovery key
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 max-w-xl">
        <Link href="/wallet-setup" className={buttonClasses({ variant: "ghost", size: "md", fullWidth: true })}>
          + Add another wallet
        </Link>
      </div>

      <Dialog
        open={confirmSwitch !== null}
        onClose={() => (busyId ? undefined : setConfirmSwitch(null))}
        title="Switch wallets?"
        description={
          <>
            New funds and safety nets will use <strong>{confirmSwitch?.name}</strong>. Your existing
            safety nets keep working exactly as before.
          </>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button fullWidth loading={busyId !== null} onClick={() => confirmSwitch && void doSwitch(confirmSwitch)}>
            Yes, switch
          </Button>
          <Button fullWidth variant="ghost" disabled={busyId !== null} onClick={() => setConfirmSwitch(null)}>
            Cancel
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={revealFor !== null}
        onClose={closeReveal}
        title={`Recovery key — ${revealFor?.name ?? ""}`}
        description={
          revealedKey
            ? "Write this down and keep it somewhere safe. Anyone with this key can move this wallet's money."
            : "Enter your PIN to show this wallet's recovery key. Never share it with anyone."
        }
      >
        {!revealedKey ? (
          <form onSubmit={doReveal} noValidate>
            <label htmlFor="reveal-pin" className="field-label">Your PIN</label>
            <PinInput
              id="reveal-pin"
              value={revealPin}
              onValueChange={setRevealPin}
              autoComplete="current-password"
              placeholder="••••••"
              aria-invalid={revealError ? true : undefined}
              aria-describedby={revealError ? "reveal-error" : undefined}
              autoFocus
            />
            {revealError ? (
              <p id="reveal-error" className="mt-2 text-[15px] font-medium text-danger" role="alert">
                {revealError}
              </p>
            ) : null}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row-reverse">
              <Button type="submit" fullWidth loading={revealBusy}>
                Show key
              </Button>
              <Button fullWidth variant="ghost" onClick={closeReveal}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <>
            <p className="break-all rounded-xl bg-paper px-4 py-4 text-center font-mono text-[14px] leading-relaxed text-ink">
              {chunked(revealedKey)}
            </p>
            <p className="mt-2 text-[14px]" aria-live="polite">
              {copyFailed ? (
                <span className="text-danger">Couldn&rsquo;t copy automatically — please write the key down.</span>
              ) : null}
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row-reverse">
              <Button fullWidth variant="secondary" onClick={() => void copy(revealedKey, "key")}>
                {copied === "key" ? "Copied" : "Copy key"}
              </Button>
              <Button fullWidth variant="ghost" onClick={closeReveal}>
                Done
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </AppShell>
  );
}
