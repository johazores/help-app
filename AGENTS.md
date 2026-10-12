# Agent rules — Sagip monorepo

Sagip is an npm workspaces monorepo: **`client-frontend`** (UI, port 8000) and
**`server-backend`** (API + Prisma + Stellar, port 8001).

## Which workspace to edit

| Task | Workspace |
|------|-----------|
| Pages, components, UX copy | `client-frontend/` |
| API routes, DB, Stellar, email, cron | `server-backend/` |
| Both | API contract changes need client `services/` + server `pages/api/` + `server/services/` |

**Read the workspace-specific rules before coding:**

- [client-frontend/AGENTS.md](./client-frontend/AGENTS.md) — Next.js 16 App Router, `proxy.ts`, no blockchain UI jargon
- [server-backend/AGENTS.md](./server-backend/AGENTS.md) — Pages Router API, service layer, Stellar, Prisma

## Stack (current)

- **Next.js 16.2+** both workspaces (Turbopack default)
- **React 19**, **TypeScript 5.7+**, **Node 20.9+**
- Client: **`proxy.ts`** proxies `/api/*` → `API_URL` (not `middleware.ts`, not config rewrites)
- Lint: **`eslint .`** (not `next lint`)

## Monorepo commands (run from repo root)

```bash
npm install
npm run dev          # both apps
npm run build        # server then client
npm run typecheck
npm run lint
npm run setup        # prisma migrate + seed
npm run e2e          # Stellar testnet (server-backend)
```

## Principles

1. **Incremental changes** — no architecture rewrites unless explicitly requested.
2. **Service classes everywhere** — client `services/*`, server `server/services/*`.
3. **Stellar stays server-side** — client never imports `@stellar/stellar-sdk`.
4. **Plain language in UI** — users never see blockchain terminology.
5. **Same-origin API** — client uses relative `/api/*` + `proxy.ts`; CORS on backend is opt-in via `CORS_ORIGIN`.
6. **Real testnet txs** — safety nets are claimable balances; preserve tx hashes and explorer links.

## Docs index

| Doc | Topic |
|-----|-------|
| [README.md](./README.md) | Product overview, setup, architecture |
| [docs/demo.md](./docs/demo.md) | Live demo script |
| [docs/onboarding.md](./docs/onboarding.md) | User guide |
| [docs/funding.md](./docs/funding.md) | USDC, reminders, CI |
| [docs/production.md](./docs/production.md) | Production path |
| [docs/succession.md](./docs/succession.md) | Backup beneficiary |

## Common mistakes

- Adding `pages/api/` under **client-frontend** (API belongs in server-backend)
- Using `fetch("http://localhost:8001/...")` in browser code (use `/api/...` via services — avoids CORS)
- Putting business logic in API route handlers instead of `server/services/`
- Re-adding `/api` rewrites in `client-frontend/next.config.ts` (use `proxy.ts` only)
- Stale **`src/`** folder at repo root — causes build errors; server `clean-stale.js` removes it on build
