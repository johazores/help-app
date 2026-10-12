# Product: Strengths & Current Limitations

## Strengths
- **A real primitive, not a feature skin:** the check-in safety net (protocol-enforced
  dead-man's switch) doesn't exist in GCash, Maya, Wise, or Coins.ph.
- **Complete loop live on testnet:** create → check in → miss → family receives, all
  on-chain with explorer-linked receipts.
- **Receiver-first design:** the least technical person gets the simplest screen — no
  account, no jargon, one button, printable QR card fallback.
- **Family tools suite:** gifts (now/dated/tranches), split nets, goals, abuloy preset,
  emergency early-open requests, paluwagan circles — one hub, core flow untouched.
- **Serious account layer:** sessions with revocation, email recovery, PIN hygiene,
  separate admin identity, wallet import/export.
- **Honesty as UX:** nothing pretends to work (cash-out, paluwagan guarantees, email
  without SMTP). Judges and users can trust what they see.

## Current limitations (known and stated)
- **No peso cash-out yet** — needs anchor/PSP partnership (the #1 roadmap item).
- **Testnet asset configuration** — the public deployment currently uses XLM; classic
  issued USDC is supported when treasury/trustlines are configured, while production
  mainnet USDC + anchor cash-out remain on the roadmap.
- **No SMS/push** — recovery and check-in reminders use email.
- **Paluwagan MVP** — no automated reminders, admin freeze UI, or dispute tooling yet.
- **Custodial signing** — the server signs for users; external-wallet signing is proposed sprint work.
- **Reconciliation is manual** — a confirmed transaction whose database write fails is logged
  (`reconciliation.required`) and repaired by hand; automatic recovery is future work.
