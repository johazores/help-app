@AGENTS.md

## Claude — client workspace cheat sheet

**Role:** Next.js 16 App Router UI only. Port **8000**.

**Before editing:** Read `AGENTS.md` above. This is Next.js **16** — use `proxy.ts`, not `middleware.ts`; use `eslint .`, not `next lint`.

**Quick layout**

| Path | Purpose |
|------|---------|
| `app/` | Pages (routes) |
| `components/` | Shared UI |
| `services/` | API client classes |
| `proxy.ts` | `/api/*` → `API_URL` |
| `lib/format.ts` | Money, dates, countdown |

**Hard rules**

1. Browser code calls **`/api/...`** only (via services) — never `:8001` directly (avoids CORS).
2. No blockchain words in user-facing strings.
3. API or Stellar changes belong in `server-backend/` first, then mirror here in `services/`.

**Verify changes**

```bash
npm run typecheck && npm run lint && npm run build
```

From repo root: `npm run dev` starts both apps.
