# Roadmap

## Tier 1 — High impact, low effort (next)
- Phone OTP at sign-up (fake-account + recovery win) once an SMS provider is chosen
- Paluwagan email reminders via the existing mailer + a cron job endpoint
- In-app notification bell (activity already recorded; surface it)
- CSP header after an inline-style audit
- Home dashboard skeleton loaders replacing spinners

## Tier 2 — High impact, higher effort (planned)
- **Anchor/PSP integration for peso cash-out (GCash/Maya/banks)** — the milestone;
  spec'd in RECEIVER-JOURNEY.md (W1–W4) and PRODUCTION.md
- USDC settlement for production money
- Admin console v2: paluwagan freeze/dispute tools, audit log, fraud flags
- Redis-backed rate limiting + idempotency keys on money endpoints
- KYC tiers with limits
- Push notifications (check-in reminders are the retention engine)

## Tier 3 — Nice to have (future)
- Taglish/Filipino localization toggle
- Repeating gifts (monthly allowance automation)
- Paluwagan round 2 duplication; custom payout order
- Biometric unlock in a wrapped mobile app
- Charts of giving history; annual "family report"

## Recently shipped (this iteration)
Security headers · app icon + installable web manifest · entrance/press micro-animations
(reduced-motion safe) · docs suite. Prior iterations: full account/session layer, wallet
onboarding + management, receiver journey, family tools hub, paluwagan MVP.
