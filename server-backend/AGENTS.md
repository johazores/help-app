# Agent rules — `server-backend`

<!-- BEGIN:nextjs-agent-rules -->
## Next.js 16 — read before coding

This workspace runs **Next.js 16.2+** (Pages Router for API routes). Training data may
describe older APIs. Key differences:

| Old (≤15) | New (16) |
|-----------|----------|
| `next lint` | **`eslint .`** (flat config in `eslint.config.mjs`) |
| `experimental.turbopack` | Top-level **`turbopack`** in `next.config.ts` |

This app does **not** use `proxy.ts` — it *is* the API target. The client proxies here.

Before using an unfamiliar Next API, check `node_modules/next/dist/docs/` or
[nextjs.org/docs](https://nextjs.org/docs). Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## What this workspace is

The **API + database + Stellar** layer for Sagip. Handles auth, safety nets, wallets,
claims, admin, email, rates, and cron jobs. Minimal `app/` exists only as a Next.js
placeholder — **all HTTP APIs are in `pages/api/`**.

Monorepo root: run commands from `help-app/` with `-w server-backend` or `npm run dev:server`.

## Boundaries — do / don't

| Do | Don't |
|----|-------|
| Put business logic in `server/services/` | Put domain logic inline in `pages/api/` handlers |
| Use `handler`, `requireUser`, `requireAdmin` from `@/lib/api` | Roll custom auth per route |
| Throw `ApiError(status, msg)` for expected failures | Return generic 500s for validation errors |
| Encrypt secrets with `@/lib/crypto` before DB storage | Store raw Stellar secret keys |
| Use Prisma via `@/lib/prisma` singleton | Create new PrismaClient per request |
| Read network config from `settingsService` / DB | Hard-code Horizon URLs or asset codes |

## Architecture

```
pages/api/**/*.ts          Thin HTTP layer (method check, auth, JSON)
  → server/services/*.ts   Domain logic
    → lib/prisma.ts        PostgreSQL
    → lib/crypto.ts        AES-256-GCM for Stellar secrets
    → stellar-service.ts   Stellar SDK (claimable balances, payments)
```

**`lib/api.ts`** exports:

- `handler(fn)` — wraps async handler, maps `ApiError` → HTTP status
- `requireUser(req)` / `requireAdmin(req)` — JWT + live session check
- `allowMethods(req, res, methods)` — early return on wrong verb

## Stellar conventions

- All on-chain ops go through **`server/services/stellar-service.ts`**.
- Safety nets = **claimable balances** with owner (unconditional) + recipient (time predicate).
- Held asset is **USDC** on testnet (configured in `Setting` table via seed).
- **`ensureUsdcReady()`** before set-aside/claim when trustline may be missing.
- Store **`claimableBalanceId`** and **`txHash`** on activity records for explorer links.
- **`SKIP_TREASURY=1`** in env skips treasury bootstrap during seed (CI/offline).

## Database

- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/` — always add a migration for schema changes
- Seed: `prisma/seed.ts` — network settings, admin bootstrap, optional treasury
- Run `npm run setup` (migrate deploy + generate + seed) after pulling schema changes

## Auth model

- **Users:** mobile + PIN → HS256 JWT in `Authorization: Bearer …` header
- **Admins:** separate identity (username/password), separate session table, `scope: "admin"` in JWT
- Sessions are **revocable** rows — token alone is not enough; handler checks DB
- Client stores tokens; this side never reads cookies for API auth

## Adding an endpoint

1. Create or extend a method in `server/services/<domain>-service.ts`
2. Add `pages/api/.../route.ts` handler:

```typescript
export default handler(async (req, res) => {
  if (!allowMethods(req, res, ["GET"])) return;
  const user = await requireUser(req);
  res.status(200).json(await someService.action(user.id));
});
```

3. Mirror the client call in `client-frontend/services/<domain>-service.ts`
4. For cron/webhook routes: protect with env secret (see `pages/api/cron/reminders.ts`)

## Environment

Required in `server-backend/.env`:

- `DATABASE_URL`, `AUTH_TOKEN_SECRET`, `APP_ENCRYPTION_KEY`

Optional: `ADMIN_*`, `SMTP_*`, `CRON_SECRET`, `SKIP_TREASURY`

Never commit `.env`. Document new vars in this file's README section.

## Commands

```bash
npm run dev              # :8001
npm run build            # clean-stale + prisma generate + next build
npm run lint             # eslint . (scripts/ ignored)
npm run typecheck
npm run prisma:migrate   # dev migrations
npm run db:seed
npm run e2e              # Stellar testnet integration test
npm run setup            # migrate deploy + generate + seed
```

## Build note

`scripts/clean-stale.js` removes a stray `src/` directory if present — leftover `src/` or
a second `pages/` next to `app/` in the **client** causes confusing build errors. Keep API
code here only.

## Lint

- Flat ESLint config; `scripts/**` ignored (CommonJS helpers).
- TypeScript strict mode; use explicit types on public service methods.

## Docs

- Product: [../README.md](../README.md)
- Stellar succession: [../docs/SUCCESSION.md](../docs/SUCCESSION.md)
- Funding sprint: [../docs/FUNDING.md](../docs/FUNDING.md)
- Production path: [../docs/PRODUCTION.md](../docs/PRODUCTION.md)
- Client rules: [../client-frontend/AGENTS.md](../client-frontend/AGENTS.md)
