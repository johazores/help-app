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
npm test                   # unit tests (no network, no database)
npm run test:integration   # database integration tests (needs DATABASE_URL)
npm run test:lifecycle     # full app lifecycle on Stellar testnet (~2 min)
npm run e2e                # protocol-level claimable-balance lifecycle on testnet
npm run setup              # migrate deploy + generate + seed
```

## Project layout

```
pages/api/           HTTP endpoints (thin handlers)
server/services/     Domain logic (stellar, safety nets, users, …)
lib/                 Infra: prisma, jwt, crypto, api guard, validation, logging
prisma/              Schema, migrations, seed
scripts/             e2e-test.ts, clean-stale.js, sync-database.mjs
tests/               unit/, integration/ (database), lifecycle/ (testnet)
instrumentation.ts   Startup validation of required secrets
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
| `GET /api/health` | Database query + Horizon reachability, network and version (CI/monitoring) |
| `GET /api/stats` | Public aggregate activity with verifiable receipt hashes |
| `GET/POST /api/cron/reminders` | Check-in reminders + rate-limit cleanup (`Bearer $CRON_SECRET`) |
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
| `CRON_SECRET` | Production | Protects `/api/cron/reminders`; without it the endpoint refuses to run in production |
| `PROXY_SHARED_SECRET` | Recommended | Lets the API trust the visitor IP forwarded by the web proxy for per-IP rate limits |
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
- **`npm run test:lifecycle`** — drives Sagip's own services against PostgreSQL and
  testnet (create, check-in, take-back, guarded receipt, receiver check-in, backup
  receipt, plus rejection cases) and writes `artifacts/app-lifecycle-receipts.json`.
- **`npm run e2e`** — protocol-level proof of the claimable-balance design with
  hand-built transactions; writes `artifacts/instawards-receipts.json`.
- See [docs/testing.md](../docs/testing.md) for what each suite covers.
- Use `SKIP_TREASURY=1` when seeding without network access (CI).

## CI

Root workflow (`.github/workflows/ci.yml`): migrate + seed → typecheck → lint → unit and
database tests → build → API smoke test, then both testnet lifecycles with uploaded
receipt manifests.

Reminders cron (`.github/workflows/reminders-cron.yml`): needs repo `API_URL` + `CRON_SECRET`.

## Related docs

- [Root README](../README.md) — architecture, demo, production path
- [docs/funding.md](../docs/funding.md) — USDC, reminders, CI, admin KPIs
- [docs/production.md](../docs/production.md) — path to production
- [docs/succession.md](../docs/succession.md) — backup beneficiary flow
- [docs/testing.md](../docs/testing.md) — test suites and evidence
- [AGENTS.md](./AGENTS.md) — AI/agent coding rules for this workspace
