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
- **Testnet USDC** — production mainnet USDC + anchor cash-out still on roadmap.
- **No SMS/push** — recovery requires email; reminders are in-app only.
- **Paluwagan MVP** — no automated reminders, admin freeze UI, or dispute tooling yet.
- **Single-instance assumptions** — in-memory rate limiting; fine now, Redis later.
- **No automated test suite** — an e2e script exists (`npm run e2e`); CI tests are planned.
