# Sagip — Path to Production

This document is an honest engineering assessment: what works now, the key decisions
still to make, and the remaining work to move from a working testnet product to something
approvable and fundable.

---

## 1. Where things stand today

**Works now (real, on testnet):**

- Custodial accounts, encrypted keys, sign-in with mobile number + PIN.
- Set aside money, check in, take back, and receive — all real claimable-balance
  transactions on Stellar testnet, each with a verifiable hash.
- **Add funds flow** — receive-to-address (with QR) plus instant test top-ups.
- **Live market rates** — USDC (held asset) valued against PHP, USD, EUR, SAR, AED, SGD, HKD,
  refreshed every minute (CoinGecko), shown as “today’s value” and on balances.
- **Admin panel** — full transaction log with explorer links, all users, all safety nets.
- **End-to-end test** — `npm run e2e` funds a sender + recipient, sends, receives, and
  asserts balances and fees on-chain.

**Deliberately still testnet-shaped:** funds are test USDC/XLM on testnet, funding uses Friendbot,
and cash-out still needs a SEP-24 anchor. The sections below are what it takes to make it real.

---

## 2. The most important product decision: hold USDC, not XLM

**Status: implemented on testnet** — safety nets settle in USDC; XLM is fees-only.

A safety net must not lose value. **XLM’s price moves**, so ₱15,000 set aside today could
be ₱12,000 next month — unacceptable for this use case. For production the held asset
should be a **stablecoin: USDC on Stellar** (1:1 USD, deep liquidity, real anchors that can
cash out to PHP).

What this changes technically:

- Each account needs a **USDC trustline** before it can hold USDC (one extra transaction at
  onboarding; costs a small XLM reserve, so accounts still need a little XLM for fees).
- Claimable balances, payments, and predicates all work identically with a credit asset —
  swap `Asset.native()` for the USDC asset (`new Asset("USDC", issuer)`).
- Testnet USDC issuer for testing: `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.
- Rates then show “≈ ₱X” from USD→PHP (and XLM only needs tracking for the tiny fee buffer).

This is the single highest-impact change for credibility with judges and users.

---

## 3. Funding & cash-out (the real on/off-ramp)

| Stage | Now (testnet) | Production (mainnet) |
|-------|---------------|----------------------|
| Deposit | Friendbot / receive-to-address | **SEP-24 anchor** deposit; local rails (GCash, InstaPay, cards) via a PH anchor/PSP |
| Cash-out | n/a | **SEP-24/SEP-31 withdrawal** to bank/GCash through a licensed anchor |
| FX | Display only | Anchor handles PHP↔USDC conversion at deposit/withdrawal |

The receive-to-address flow already built is the same primitive real wallets use, so it
carries over. The new work is integrating a **PH-capable anchor** (e.g. a Stellar anchor
offering PHP rails) via the SEP-24 interactive flow, plus a withdrawal screen. Until an
anchor is wired in, there is no way to turn balances into pesos — this is the biggest
missing piece for a shippable remittance/savings product.

---

## 4. Security & custody hardening

Custodial means we hold users’ money — the bar is high:

- **Key management:** move secret-key encryption from an app env key to a managed
  **KMS/HSM** (AWS KMS, GCP KMS). Keys should never be decryptable by the app process at
  rest; sign via the KMS.
- **Account model:** consider per-user keys with a co-signing service, or a master + muxed
  accounts design, so a single leaked key can’t drain everyone.
- **Auth (now built):** sign-in/sign-up **rate limiting**, **PIN recovery** via verified
  email with one-time codes, **email verification**, **multi-device session management**
  with revocation, and a **separate admin identity** (username/email/password). Remaining:
  OTP/2FA for withdrawals; move the in-memory rate limiter to Redis for multi-instance
  deployments; SMS-based recovery for users without email.
- **Transaction safety:** idempotency keys on money-moving endpoints, sequence-number
  management under concurrency, retry with backoff, and confirmation screens for
  irreversible actions.
- **Auditability:** immutable audit log of every money movement and admin action.

---

## 5. Compliance (Philippines)

A custodial app moving value is regulated. Before real money:

- **BSP registration** as a VASP/EMI (or partner with a licensed anchor that carries the
  license).
- **KYC/AML** onboarding (ID verification, sanctions screening) per AMLA.
- **Data privacy** (RA 10173): the app already avoids storing plaintext secrets; add a
  privacy policy, consent, retention limits, and a DPO.

For the workshop/pilot, staying on testnet with clear “not real money” labeling avoids all
of this — but the plan must show awareness of it.

---

## 6. Reliability & operations

- **Testnet resets** wipe accounts a few times a year — handle gracefully (detect missing
  accounts, re-provision) and never rely on persistence in tests.
- **Rates:** CoinGecko free tier is fine for a pilot; production needs a fallback provider
  and, ideally, an on-chain DEX cross-check so a single API outage doesn’t freeze the UI.
  Rates are cached server-side and already degrade to “last known”.
- **Background jobs:** notify recipients (SMS/push) when a net opens; sweep/settle if
  needed; monitor Horizon submission failures.
- **Observability:** structured logging, error tracking, and alerts on failed submissions.

---

## 7. Missing UX pieces

- **Withdrawal / cash-out screen** (blocked on anchor integration).
- **Notifications** — SMS or push when it’s time to check in, and when a net opens to
  family. Critical for the “dead man’s switch” to actually work in real life.
- **PIN recovery** for locked-out users.
- **Transaction receipts** the user can save/share.
- **Confirm-amount review** before setting aside / topping up.

---

## 8. Testing

- ✅ **On-chain E2E** (`npm run e2e`) — fund → send → receive → assert balances & fees.
- Add **unit tests** for services (predicates, conversions, validation).
- Add **API integration tests** (sign-up → set aside → check-in → claim) against a test DB
  + testnet.
- Add **CI** running typecheck + build + e2e on every push.
- Add **load testing** for Horizon submission throughput before launch.

---

## 9. Suggested delivery order

1. **Switch held asset to USDC** (stability) + trustline onboarding step. *(highest impact)*
2. **Withdrawal screen + SEP-24 anchor** integration (real cash-out). *(unblocks the product)*
3. **KMS-backed key custody** + rate limiting + PIN recovery. *(security must-haves)*
4. **Notifications** (SMS/push) for check-in reminders and net-opens. *(makes the core idea real)*
5. **KYC/AML + BSP path** via anchor partnership. *(compliance to handle real money)*
6. **CI + unit/integration tests + observability.** *(operational maturity)*

Everything above 1–4 is buildable on the current architecture without rework — the service
layer, custodial model, and claimable-balance mechanics already in place carry straight over.
