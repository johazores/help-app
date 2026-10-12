"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { claimService } from "@/services/claim-service";
import type { RecoveredClaimLink } from "@/services/types";
import { loadErrorMessage } from "@/lib/api-errors";
import { formatMoney } from "@/lib/format";

export default function ClaimRecoverPage() {
  const [phone, setPhone] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RecoveredClaimLink[] | null>(null);

  async function lookup(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      setItems(await claimService.recover(phone, senderPhone));
    } catch (err) {
      setError(loadErrorMessage(err));
      setItems(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="container-page flex h-16 items-center">
        <Logo />
      </header>

      <main className="container-page flex flex-1 justify-center py-8">
        <div className="w-full max-w-md">
          <h1 className="font-display text-[28px] font-bold text-ink">Find your link again</h1>
          <p className="mt-2 text-[17px] leading-relaxed text-body">
            Lost your phone or the message with your link? Enter your mobile number and the
            mobile number of the person who set the money aside for you.
          </p>

          <form className="card mt-6 space-y-4 p-6" onSubmit={lookup} noValidate>
            <Field label="Your mobile number">
              {(id) => (
                <Input
                  id={id}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09XX XXX XXXX"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                />
              )}
            </Field>
            <Field
              label="Their mobile number"
              hint="The number of the family member who sent you the money."
            >
              {(id) => (
                <Input
                  id={id}
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="09XX XXX XXXX"
                  inputMode="tel"
                  autoComplete="off"
                  required
                />
              )}
            </Field>
            <Button type="submit" fullWidth loading={loading}>
              Find my links
            </Button>
            {error ? (
              <p className="text-[15px] font-medium text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </form>

          <div aria-live="polite">
            {items ? (
              <div className="mt-6 space-y-3">
                {items.length === 0 ? (
                  <p className="text-[15px] text-body">
                    We couldn&rsquo;t find any links for those numbers. Check both numbers, or ask
                    the person who sent you the money to share the link again from their Sagip
                    app. A printed card works too, if they gave you one.
                  </p>
                ) : (
                  items.map((item) => (
                    <Link
                      key={item.claimCode}
                      href={`/claim/${item.claimCode}`}
                      className="card block p-5 transition-shadow hover:shadow-lift"
                    >
                      <p className="text-[14px] text-subtle">From {item.fromName}</p>
                      <p className="text-[18px] font-bold text-ink">{item.label}</p>
                      <p className="mt-1 text-[15px] text-body">
                        {formatMoney(item.amount)} · for {item.forName}
                      </p>
                      <p className="mt-2 text-[14px] font-semibold text-ink">Open your link →</p>
                    </Link>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <p className="mt-6 text-[14px] text-subtle">
            Tip: save your link somewhere safe — a printed card, another phone, or a note at home.
            The person who sent you the money can also copy the link again from their app anytime.
          </p>
        </div>
      </main>
    </div>
  );
}
