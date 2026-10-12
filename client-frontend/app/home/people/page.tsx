"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/spinner";
import { PeopleIcon } from "@/components/ui/icons";
import { RecipientForm } from "@/components/recipient-form";
import { LoadErrorBanner } from "@/components/load-error-banner";
import { authService } from "@/services/auth-service";
import { recipientService } from "@/services/recipient-service";
import { handleProtectedLoadError, loadErrorMessage } from "@/lib/api-errors";
import type { Recipient } from "@/services/types";

export default function PeoplePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [adding, setAdding] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const list = await recipientService.list();
      setRecipients(list);
      return list;
    } catch (err) {
      if (handleProtectedLoadError(err, router, () => authService.signOut()) === "error") {
        setLoadError(loadErrorMessage(err));
      }
      return null;
    } finally {
      setReady(true);
    }
  }, [router]);

  useEffect(() => {
    if (!authService.isSignedIn()) {
      router.replace("/sign-in");
      return;
    }
    // Open the form straight away only for someone with no loved ones yet.
    void load().then((list) => setAdding(list?.length === 0));
  }, [router, load]);

  if (!ready) {
    return (
      <AppShell>
        <PageSpinner />
      </AppShell>
    );
  }

  return (
    <AppShell>
      {loadError ? <LoadErrorBanner message={loadError} onRetry={() => void load()} /> : null}
      <h1 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">Loved ones</h1>
      <p className="mt-2 text-[17px] text-body">The people you can set money aside for.</p>

      <ul className="mt-8 max-w-xl space-y-3">
        {recipients.map((r) => (
          <li key={r.id} className="card flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink">
              <PeopleIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[18px] font-semibold text-ink">{r.name}</p>
              <p className="text-[15px] text-subtle">{r.relationship}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="sr-only" role="status">
        {savedName ? `${savedName} was added.` : ""}
      </p>

      <div className="mt-4 max-w-xl">
        {adding ? (
          <div className="card p-6">
            <h2 className="mb-4 text-[18px] font-bold text-ink">Add someone new</h2>
            <RecipientForm
              framed={false}
              onSaved={(created) => {
                setRecipients((prev) => [...prev, created]);
                setSavedName(created.name);
                setAdding(false);
              }}
              onCancel={recipients.length > 0 ? () => setAdding(false) : undefined}
            />
          </div>
        ) : (
          <Button variant="ghost" size="md" onClick={() => setAdding(true)}>
            + Add someone new
          </Button>
        )}
      </div>
    </AppShell>
  );
}
