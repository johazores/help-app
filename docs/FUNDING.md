# Sagip — Funding Sprint Improvements

This document tracks incremental improvements made to strengthen the product for
judges, investors, and partners — without changing the core architecture or user journey.

## Implemented

### USDC as held asset (testnet)

- Safety nets and balances settle in **USDC** (stable value) instead of volatile XLM.
- XLM remains only for network fees (Friendbot-funded reserve).
- `prisma/seed.ts` bootstraps a USDC treasury via path payment on testnet.
- Configure via `Setting` table: `stellar.heldAsset`, `stellar.usdcIssuer`, etc.
- Set `SKIP_TREASURY=1` to skip treasury bootstrap (CI, offline dev).

### Check-in reminders

- Email reminders when a safety net is past **50%** of its check-in window.
- Requires verified email + SMTP (`SMTP_*` env vars).
- Cron endpoint: `POST /api/cron/reminders` with `Authorization: Bearer $CRON_SECRET`.
- Schedule hourly in production (GitHub Actions, Vercel Cron, etc.).

### UX & trust messaging

- Home dashboard **check-in banner** when any net is past half its window.
- Confirm screen explains rules are **recorded permanently**.
- Activity timeline: “Saved permanently — not just in the app.”
- Guide FAQ: rule immutability + shutdown/recovery key.
- Welcome slide: monthly use via Family tools.
- **Withdraw shell** at `/home/withdraw` (honest “coming soon” for SEP-24 cash-out).

### Admin KPIs

- Check-ins count, delivered count (received + opened), paginated lists (100 rows).
- Aggregate query for total set aside (no full-table scan in app code).

### Atomic split safety net

- Split tool now creates **one Stellar transaction** with multiple `createClaimableBalance` ops.
- API: `POST /api/safety-nets/split`
- Cheaper, atomic, and stronger demo story for judges.

### USDC trustline migration

- `ensureUsdcReady()` runs automatically when using wallets and before set-aside/claim.
- Fixes pre-USDC accounts that lacked a USDC trustline.

### Health check

- `GET /api/health` — DB + Stellar config smoke test for monitoring/CI.

### ESLint + CI

- ESLint installed and configured (flat config via `@eslint/eslintrc`).
- `npm run lint` now works across both workspaces.

### Admin metrics fix

- **Open to family** counts ACTIVE nets past unlock time (was always 0 — OPENED status unused).
- **Delivered** counts RECEIVED + GUARDED + BACKUP_RECEIVED.

### Receiver journey

- Claim success screen shows permanent receipt note + honest cash-out “coming soon”.

### Performance

- Split: one tx instead of N sequential API calls.
- Admin: paginated lists (100 rows), aggregate counts.

### CI

- `.github/workflows/ci.yml`: typecheck, lint, build, optional e2e on push.

## Demo additions (see DEMO.md)

- Succession flow with backup beneficiary (~2 min add-on).
- Admin panel → explorer link live during pitch.
- Optional “Send a gift” beat for monthly-use positioning.

## Next (partnership-dependent)

1. **SEP-24 anchor** — real GCash/Maya/bank cash-out.
2. **SMS reminders** — Semaphore/Twilio for users without email.
3. **Atomic split** — single Stellar tx with multiple claimable balances.
4. **KMS/HSM** — production key custody.

## Environment variables (new)

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Protects `/api/cron/reminders` |
| `SKIP_TREASURY` | Skip USDC treasury bootstrap in seed (`1` for CI) |

See `server-backend/.env.example` for the full list.
