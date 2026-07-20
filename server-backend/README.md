# Sagip — Server (`server-backend`)

Next.js **16** Pages Router **API** + **Prisma** + **Stellar SDK**. Runs on **port 8001**.
All domain logic lives in `server/services/`; HTTP handlers in `pages/api/` stay thin.

See the [root README](../README.md) for product context, Stellar mechanics, and full setup.

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (Pages Router API, Turbopack) |
| Database | PostgreSQL via Prisma 6 |
| Blockchain | `@stellar/stellar-sdk` — claimable balances on testnet |
| Auth | Hand-rolled HS256 JWT + live session rows |
| Email | Nodemailer (SMTP settings seeded from env) |

## Development

From the **repo root** (recommended):

```bash
npm install
cp server-backend/.env.example server-backend/.env
npm run setup              # migrate + generate + seed
npm run dev                # client :8000 + server :8001
npm run dev:server         # this workspace only
```

From this directory:

```bash
npm run dev                # next dev -p 8001
npm run build              # clean-stale + prisma generate + next build
npm run start
npm run lint               # eslint .
npm run typecheck
npm run prisma:migrate     # prisma migrate dev
npm run db:seed
npm run e2e                # Stellar testnet fund → set aside → claim
npm run setup              # migrate deploy + generate + seed
```

## Project layout

```
pages/api/           HTTP endpoints (thin handlers)
server/services/     Domain logic (stellar, safety nets, users, …)
lib/                 Infra: prisma, jwt, crypto, api guard (requireUser)
prisma/              Schema, migrations, seed
scripts/             e2e-test.ts, clean-stale.js
```

## API handler pattern

Handlers use `handler()` from `@/lib/api`, validate methods with `allowMethods`, and
delegate to services:

```typescript
export default handler(async (req, res) => {
  if (!allowMethods(req, res, ["GET", "POST"])) return;
  const user = await requireUser(req);
  // … call service, return JSON
});
```

Throw `ApiError(status, message)` from services for clean HTTP errors.

## Key endpoints

| Path | Purpose |
|------|---------|
| `GET /api/health` | DB + Stellar config smoke test (CI/monitoring) |
| `POST /api/cron/reminders` | Check-in email reminders (`Bearer $CRON_SECRET`) |
| `/api/auth/*` | Sign-up, sign-in, sessions, PIN reset |
| `/api/safety-nets/*` | Core safety-net CRUD, check-in, split |
| `/api/claim/[code]/*` | Family claim flow (no user auth) |
| `/api/admin/*` | Separate admin identity + overview |

Full route list: run `npm run build` and inspect the Pages Router output.

## Environment variables

Create `server-backend/.env` from the example:

```bash
cp .env.example .env
```

See [`.env.example`](./.env.example) for the full annotated list. Summary:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_TOKEN_SECRET` | Yes | HS256 signing key (≥32 chars) |
| `APP_ENCRYPTION_KEY` | Yes | 32-byte key, base64 — encrypts Stellar secrets at rest |
| `ADMIN_USERNAME` | Seed | Admin bootstrap username |
| `ADMIN_EMAIL` | Seed | Admin bootstrap email |
| `ADMIN_PASSWORD` | Seed | Admin bootstrap password |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional | Email (PIN reset, check-in reminders) |
| `CRON_SECRET` | Production | Protects `POST /api/cron/reminders` |
| `CORS_ORIGIN` | Optional | Comma-separated browser origins for **direct** cross-origin API access (not needed when client proxies `/api`) |
| `SKIP_TREASURY` | CI/offline | Set `1` to skip USDC treasury bootstrap in seed |

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"  # AUTH_TOKEN_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"     # APP_ENCRYPTION_KEY
```

Network settings (Horizon URL, USDC issuer, held asset) are seeded into the `Setting`
table — not hard-coded in source.

## Stellar & testing

- **Testnet only** in current build — real txs on Stellar testnet, no mainnet money.
- The held asset is configurable: the public test deployment uses XLM, while a funded
  classic issued USDC test asset can be enabled with the required trustlines.
- **`npm run e2e`** — funds sender/recipient via Friendbot, creates claimable balance,
  claims it, asserts balances on-chain.
- Use `SKIP_TREASURY=1` when seeding without network access (CI).

## CI

Root workflow (`.github/workflows/ci.yml`): migrate + seed → typecheck → lint → build →
health smoke test. E2e runs on push to main/master.

Reminders cron (`.github/workflows/reminders-cron.yml`): needs repo `API_URL` + `CRON_SECRET`.

## Related docs

- [Root README](../README.md) — architecture, demo, production path
- [docs/FUNDING.md](../docs/FUNDING.md) — USDC, reminders, CI, admin KPIs
- [docs/PRODUCTION.md](../docs/PRODUCTION.md) — path to production
- [docs/SUCCESSION.md](../docs/SUCCESSION.md) — backup beneficiary flow
- [AGENTS.md](./AGENTS.md) — AI/agent coding rules for this workspace
