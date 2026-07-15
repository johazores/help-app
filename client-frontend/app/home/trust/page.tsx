"use client";

import { AppShell } from "@/components/app-shell";
import { TrustCenter } from "@/components/trust-center";

export default function InAppTrustPage() {
  return (
    <AppShell>
      <TrustCenter insideApp />
    </AppShell>
  );
}
