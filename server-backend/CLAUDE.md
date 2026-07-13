@AGENTS.md

## Claude — server workspace cheat sheet

**Role:** Next.js 16 Pages Router API + Prisma + Stellar. Port **8001**.

**Before editing:** Read `AGENTS.md` above. Business logic goes in `server/services/`, not in route handlers.

**Quick layout**

| Path | Purpose |
|------|---------|
| `pages/api/` | HTTP endpoints (thin) |
| `server/services/` | Domain logic |
| `lib/api.ts` | `handler`, `requireUser`, `ApiError` |
| `lib/crypto.ts` | Encrypt Stellar secrets at rest |
| `prisma/` | Schema, migrations, seed |

**Hard rules**

1. Stellar operations only in **`stellar-service.ts`**.
2. Never persist raw secret keys — use **`crypto.encrypt`**.
3. New endpoints need a matching **`client-frontend/services/*`** update.
4. Schema changes need a **Prisma migration** + seed update if settings change.

**Verify changes**

```bash
npm run typecheck && npm run lint && npm run build
npm run e2e    # Stellar testnet — run when touching stellar-service or claim flow
```

From repo root: `npm run setup` after schema changes; `npm run dev` for full stack.
