# Sagip — Client (`client-frontend`)

Next.js **16** App Router UI for Sagip. Runs on **port 8000** and talks to the backend
through relative `/api/...` paths — never call `localhost:8001` from browser code.

See the [root README](../README.md) for product context, Stellar mechanics, and full setup.

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 3 |
| API access | `services/*` → `/api/*` (proxied to backend) |
| Proxy | `proxy.ts` (Next.js 16 — replaces `middleware.ts` + config rewrites) |

## Development

From the **repo root** (recommended):

```bash
npm install
npm run dev              # client :8000 + server :8001
npm run dev:client       # this workspace only
```

From this directory:

```bash
npm run dev              # next dev -p 8000
npm run build
npm run start
npm run lint             # eslint . (next lint removed in Next 16)
npm run typecheck
```

Open http://localhost:8000. The API at http://localhost:8001 is proxied automatically.

## API proxy (`proxy.ts`)

Browser code uses `fetch("/api/...")` via `services/api-client.ts`. At runtime,
`proxy.ts` rewrites those requests to the backend:

- **Dev default:** `http://localhost:8001`
- **Production:** set `API_URL` to your backend origin (e.g. `https://api.example.com`)

Do **not** add `/api` rewrites in `next.config.ts` — that duplicates the proxy.

## Project layout

```
app/              App Router pages (auth, home, claim, admin, …)
components/       Reusable UI (app-shell, balance-card, ui/*)
services/         Client-side API service classes (one per domain)
lib/format.ts     Display helpers (money, countdown, dates)
proxy.ts          Rewrites /api/* → backend (API_URL)
next.config.ts    Security headers, turbopack root, monorepo tracing
```

## Conventions

- **No blockchain jargon** in user-facing copy (no “wallet seed”, “Stellar”, “XLM” in UI).
- **Service classes only** for HTTP — pages/components call `authService`, `safetyNetService`, etc.
- **Client components** (`"use client"`) for interactive pages; keep server components where possible.
- **Auth tokens** live in `localStorage` (`sagip.token`, `sagip.admin.token`) via `api-client.ts`.
- **Path alias:** `@/*` maps to this workspace root.

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `API_URL` | Production | Backend origin for `proxy.ts` (omit locally — defaults to `:8001`) |

All secrets (`DATABASE_URL`, `AUTH_TOKEN_SECRET`, Stellar keys, SMTP, …) belong in
`server-backend/.env`, not here.

## Related docs

- [Root README](../README.md) — architecture, setup, demo script
- [docs/DEMO.md](../docs/DEMO.md) — live pitch walkthrough
- [docs/ONBOARDING.md](../docs/ONBOARDING.md) — user-facing guide
- [AGENTS.md](./AGENTS.md) — AI/agent coding rules for this workspace
