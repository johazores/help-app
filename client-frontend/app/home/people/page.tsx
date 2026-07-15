"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { PeopleIcon } from "@/components/ui/icons";
import { authService } from "@/services/auth-service";
import { recipientService } from "@/services/recipient-service";
import { handleProtectedLoadError, loadErrorMessage } from "@/lib/api-errors";
import { LoadErrorBanner } from "@/components/load-error-banner";
import type { Recipient } from "@/services/types";

export default function PeoplePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => {
    setLoadError(null);
    return recipientService
      .list()
      .then((list) => {
        setRecipients(list);
        setAdding(list.length === 0);
      })
      .catch((err) => {
        if (handleProtectedLoadError(err, router, () => authService.signOut()) === "error") {
          setLoadError(loadErrorMessage(err));
        }
      })
      .finally(() => setReady(true));
  };

  useEffect(() => {
    if (!authService.isSignedIn()) {
      router.replace("/sign-in");
      return;
    }
    void load();
  }, [router, load]);

  async function save() {
    setError(null);
    if (name.trim().length < 2 || relationship.trim().length < 2) {
      setError("Please enter their name and how they're related to you.");
      return;
    }
    setSaving(true);
    try {
      const created = await recipientService.create({ name, relationship, phone: phone || undefined });
      setRecipients((prev) => [...prev, created]);
      setName("");
      setRelationship("");
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that person.");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
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
      <h1 className="font-display text-[30px] font-bold text-ink sm:text-[36px]">Loved ones</h1>
      <p className="mt-2 text-[17px] text-body">The people you can set money aside for.</p>

      <div className="mt-8 max-w-xl space-y-3">
        {recipients.map((r) => (
          <div key={r.id} className="card flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink">
              <PeopleIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[18px] font-semibold text-ink">{r.name}</p>
              <p className="text-[15px] text-subtle">{r.relationship}</p>
            </div>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="mt-4 max-w-xl">
          <div className="card space-y-4 p-6">
            <h2 className="text-[18px] font-bold text-ink">Add someone new</h2>
            <Field label="Their name">
              {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="Elena dela Cruz" />}
            </Field>
            <Field label="How are they related to you?" error={error ?? undefined}>
              {(id) => (
                <Input id={id} value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="Mother" />
              )}
            </Field>
            <Field label="Their mobile number (optional)" hint="Lets them find their link again if they lose their phone.">
              {(id) => (
                <Input id={id} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09XX XXX XXXX" inputMode="tel" />
              )}
            </Field>
            <div className="flex gap-3">
              <Button size="md" loading={saving} onClick={save}>
                Save
              </Button>
              {recipients.length > 0 ? (
                <Button size="md" variant="ghost" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 max-w-xl">
          <Button variant="ghost" size="md" onClick={() => setAdding(true)}>
            + Add someone new
          </Button>
        </div>
      )}
    </AppShell>
  );
}
