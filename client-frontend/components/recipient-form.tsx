"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { loadErrorMessage } from "@/lib/api-errors";
import { recipientService } from "@/services/recipient-service";
import type { Recipient } from "@/services/types";

/** Adds a loved one. Used on the Loved ones page and inline while setting money aside. */
export function RecipientForm({
  onSaved,
  onCancel,
  framed = true,
}: {
  onSaved: (recipient: Recipient) => void;
  onCancel?: () => void;
  framed?: boolean;
}) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setError(null);
    if (name.trim().length < 2 || relationship.trim().length < 2) {
      setError("Please enter their name and how they're related to you.");
      return;
    }
    setSaving(true);
    try {
      const created = await recipientService.create({
        name: name.trim(),
        relationship: relationship.trim(),
        phone: phone.trim() || undefined,
      });
      setName("");
      setRelationship("");
      setPhone("");
      onSaved(created);
    } catch (err) {
      setError(loadErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={save}
      noValidate
      className={framed ? "rounded-xl border border-line bg-white p-5" : undefined}
    >
      <div className="space-y-4">
        <Field label="Their name">
          {(id, control) => (
            <Input
              id={id}
              {...control}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Elena dela Cruz"
              autoComplete="off"
            />
          )}
        </Field>
        <Field label="How are they related to you?">
          {(id, control) => (
            <Input
              id={id}
              {...control}
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              placeholder="Mother"
              autoComplete="off"
            />
          )}
        </Field>
        <Field
          label="Their mobile number (optional)"
          hint="Lets them find their link again if they lose their phone."
        >
          {(id, control) => (
            <Input
              id={id}
              {...control}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09XX XXX XXXX"
              inputMode="tel"
              autoComplete="off"
            />
          )}
        </Field>
        {error ? (
          <p className="text-[15px] font-medium text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex gap-3">
          <Button type="submit" size="md" loading={saving}>
            Save
          </Button>
          {onCancel ? (
            <Button size="md" variant="ghost" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}

/** Radio list of loved ones. */
export function RecipientPicker({
  name,
  recipients,
  value,
  onChange,
  legend,
}: {
  name: string;
  recipients: Recipient[];
  value: string;
  onChange: (id: string) => void;
  legend: string;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">{legend}</legend>
      {recipients.map((r) => (
        <label
          key={r.id}
          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${
            value === r.id ? "border-ink bg-ink/5" : "border-line bg-white"
          }`}
        >
          <input
            type="radio"
            name={name}
            className="h-5 w-5 accent-[#0C3B3A]"
            checked={value === r.id}
            onChange={() => onChange(r.id)}
          />
          <span>
            <span className="block text-[17px] font-semibold text-ink">{r.name}</span>
            <span className="block text-[15px] text-subtle">{r.relationship}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
