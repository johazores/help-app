# Threat Model: Risks and Mitigations

How Sagip thinks about the ways a family-money product gets attacked, and what is
built today vs. planned. Honest status markers: [Live] / [Planned].

## Account takeover
- **Risk:** stolen PIN or session → attacker drains wallets or takes back safety nets.
- [Live] PINs hashed with scrypt (salted); sessions are server-side rows with instant
  revocation; JWTs are useless once their session is revoked. Changing a PIN signs out
  every other device; recovery signs out **all** devices. Sign-in is rate-limited per
  normalized phone number and per visitor IP in PostgreSQL, so limits hold across every
  server instance and can't be bypassed by writing the number differently. Unknown numbers
  take the same hashing time as wrong PINs, so timing doesn't reveal who has an account.
  Recovery codes are hashed, expire in 15 min, 5 attempts max.
- [Live] Multi-device session list lets users spot and evict unknown devices.
- [Planned] SMS OTP as second factor for high-value actions; login anomaly alerts.

## Phishing & scams
- **Risk:** fake "Sagip" pages harvesting PINs; scam claim links.
- [Live] Claim links never ask the receiver for a PIN, password, or personal data —
  there is nothing to phish on the receive path. Receiver pages state who sent the money.
- [Live] Security headers (frame denial, MIME sniffing protection, strict referrer) and a
  content security policy that restricts every request to Sagip's own origin, so an
  injected script could not send a session token elsewhere. HSTS in production.
- [Live] Finding a lost claim link requires both the receiver's and the sender's mobile
  numbers; knowing one phone number is not enough to list a family's links.
- [Planned] Custom domain link preview cards; "Sagip will never ask for your PIN" education.

## Fake accounts & money mules
- **Risk:** throwaway accounts abusing test funds or laundering through gift links.
- [Live] One account per phone number; wallet cap (10) and loved-one cap (50); test top-up
  caps; rate limits on every endpoint that creates network accounts or spends test funds
  (wallets, loved ones, top-ups, imports, paluwagan creation/joins, early requests).
- [Planned] Phone OTP verification at sign-up; velocity limits per day; KYC tiers before
  higher limits (required anyway for real-peso launch — see production.md).

## Payment disputes
- **Risk:** "I never got it" / "I never sent it."
- [Live] Every money movement records an on-chain transaction hash shown as a reference
  number (SGP-XXXXX) and linked in history; the ledger is the arbiter. Senders can only
  take back money that hasn't been received; receivers can only receive what's open.
  The protocol itself (claimable balances) makes double-spend of a net impossible.
- [Live] If a transaction confirms but the database write fails, a
  `reconciliation.required` log event records the transaction hash and balance ids.
- [Live] Paluwagan contributions are reserved before payment, so a double tap can't pay a
  round twice.
- [Planned] Admin dispute console (freeze/resolve) — schema-ready for paluwagan.

## Paluwagan-specific fraud
- **Risk:** a member receives an early round and stops paying (the classic paluwagan scam).
- [Live] Invite-only (no discovery), rules locked at start, payout order visible before
  joining, PIN confirmation on join/start/contribute, member-to-member direct payments
  (Sagip never pools funds — smaller theft surface AND smaller regulatory surface), full
  per-round visibility of who has paid, low group/amount caps, explicit trust disclosure.
- **Honest limit:** software cannot force a human to keep paying. Mitigation is social
  (invite-only trust) + [Planned] admin freeze and abuse blocking.

## Custody of keys
- [Live] Secret keys encrypted at rest with AES-256-GCM under a server key held in env
  (never in the DB); revealing a recovery key requires the account PIN and is rate-limited;
  admin surfaces show public keys only. [Planned] KMS/HSM key management for production.

## Admin surface
- [Live] Admins are a separate identity (username/email/password, own sessions, own token
  scope) — a compromised user account can never become admin. Admin sign-in is rate-limited
  with non-enumerating errors. [Planned] 2FA for admins; audited admin action log.

## Known gaps (tracked, not hidden)
Custodial signing on the server (external-wallet signing is proposed sprint work) ·
automatic reconciliation of `reconciliation.required` events (logged today, repaired by
hand) · session tokens in browser storage, mitigated by the content security policy ·
email recovery requires SMTP config · testnet XLM volatility is out of scope until the
USDC/anchor production step.
