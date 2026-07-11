"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { apiClient } from "@/services/api-client";
import { formatMoney } from "@/lib/format";

interface RecoverItem {
  label: string;
  fromName: string;
  forName: string;
  amount: string;
  status: string;
  claimCode: string;
  isOpen: boolean;
}

export default function ClaimRecoverPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RecoverItem[] | null>(null);

  async function lookup() {
    setError(null);
    setLoading(true);
    try {
      const list = await apiClient.request<RecoverItem[]>("/claim/recover", {
        method: "POST",
        body: { phone },
        auth: false,
      });
      setItems(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't look that up.");
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

      <div className="container-page flex flex-1 justify-center py-8">
        <div className="w-full max-w-md">
          <h1 className="font-display text-[28px] font-bold text-ink">Find your link again</h1>
          <p className="mt-2 text-[17px] leading-relaxed text-body">
            Lost your phone or the message with your link? Enter the mobile number your family
            saved for you when they set this up.
          </p>

          <div className="card mt-6 space-y-4 p-6">
            <Field label="Your mobile number">
              {(id) => (
                <Input
                  id={id}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09XX XXX XXXX"
                  inputMode="tel"
                />
              )}
            </Field>
            <Button fullWidth loading={loading} onClick={lookup}>
              Find my links
            </Button>
            {error ? (
              <p className="text-[15px] font-medium text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          {items ? (
            <div className="mt-6 space-y-3">
              {items.length === 0 ? (
                <p className="text-[15px] text-body">
                  We couldn&rsquo;t find any links for that number. Ask whoever sent you the money
                  to share the link again from their Sagip app, or check a printed card if they
                  gave you one.
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

          <p className="mt-6 text-[14px] text-subtle">
            Tip: save your link somewhere safe — a printed card, another phone, or a note at home.
            The person who sent you the money can also copy the link again from their app anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
