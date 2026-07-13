# Agent rules — `client-frontend`

<!-- BEGIN:nextjs-agent-rules -->
## Next.js 16 — read before coding

This workspace runs **Next.js 16.2+**. Training data may describe older APIs. Key differences:

| Old (≤15) | New (16) |
|-----------|----------|
| `middleware.ts` + `middleware()` | **`proxy.ts`** + `proxy()` |
| `next lint` | **`eslint .`** (flat config in `eslint.config.mjs`) |
| Config rewrites for `/api` | **`proxy.ts`** rewrites to `API_URL` |
| `experimental.turbopack` | Top-level **`turbopack`** in `next.config.ts` |

Before using an unfamiliar Next API, check `node_modules/next/dist/docs/` or
[nextjs.org/docs](https://nextjs.org/docs). Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## What this workspace is

The **browser UI** for Sagip — a Filipino safety-net app (OFW sets money aside for family;
Stellar claimable balances enforce rules on-chain). This package has **no database, no
Stellar SDK, no Prisma**. All persistence and blockchain logic live in `server-backend/`.

Monorepo root: run commands from `help-app/` with `-w client-frontend` or use `npm run dev`.

## Boundaries — do / don't

| Do | Don't |
|----|-------|
| Edit `app/`, `components/`, `services/`, `lib/format.ts` | Add `pages/api/` routes here |
| Call backend via `services/*` → `/api/...` | `fetch("http://localhost:8001/...")` from browser code |
| Keep UI free of blockchain jargon | Show "Stellar", "XLM", "seed phrase", "blockchain" to users |
| Use `@/` path alias | Import from `server-backend/` |
| Match existing Tailwind + component patterns | Introduce a new UI library without reason |

## Architecture

```
Page (app/**/*.tsx)
  → service class (services/*-service.ts)
    → apiClient.request("/path")   // hits /api/path
      → proxy.ts rewrites to server-backend
```

- **`services/api-client.ts`** — shared HTTP + JWT in `localStorage` (`sagip.token`, `sagip.admin.token`).
- **`services/types.ts`** — shared response shapes; keep in sync with backend JSON.
- **One service per domain** — mirror `server-backend/server/services/` names where possible.

## UI conventions

- Interactive pages are **`"use client"`** components (auth checks, forms, timers).
- Reuse **`AppShell`**, **`Button`**, **`Input`**, **`Field`**, **`Card`**, **`Badge`**, **`Spinner`** from `components/ui/`.
- Money display: **`formatMoney`**, **`countdown`**, **`windowProgress`** from `lib/format.ts`.
- Mobile-first layout; plain language for non-technical users (including elderly family).
- Admin UI (`/admin`) uses **`adminAuthService`** / **`adminService`** with admin token scope.

## API proxy

`proxy.ts` matches `/api/:path*` and rewrites to `API_URL` (default `http://localhost:8001`).

- Do **not** re-add `rewrites()` for `/api` in `next.config.ts`.
- In production, deploy with `API_URL` pointing at the backend origin.

## Commands

```bash
npm run dev          # :8000 (from this dir or root npm run dev:client)
npm run build
npm run lint         # eslint . — NOT next lint
npm run typecheck
```

## Lint & TypeScript

- ESLint flat config: `eslint-config-next/core-web-vitals` + `/typescript`.
- `react-hooks/set-state-in-effect` and `react-hooks/purity` are intentionally off — existing data-fetch effects use standard patterns.
- `jsx` is `react-jsx` (automatic runtime).

## When changing API contracts

If you add or change an endpoint, update **both**:

1. `server-backend/pages/api/…` + `server-backend/server/services/…`
2. Matching `client-frontend/services/…-service.ts` (+ `types.ts` if needed)

Never implement business rules only on the client.

## Docs

- Product & demo: [../README.md](../README.md), [../docs/DEMO.md](../docs/DEMO.md)
- User guide: [../docs/ONBOARDING.md](../docs/ONBOARDING.md)
- Backend rules: [../server-backend/AGENTS.md](../server-backend/AGENTS.md)
