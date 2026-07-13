# Sagip

**Money set aside for the people you love.**

Sagip lets someone — typically an overseas worker — set money aside for a specific
family member. As long as they periodically tap **“I’m okay,”** the money stays
entirely theirs; they can take it back at any moment. If they ever *stop* checking
in — hospitalised abroad, phone lost, or worse — the money automatically opens to
their chosen loved one on a date they set. It’s a safety net for savings, built for
the exact fear every OFW family lives with.

**Backup beneficiary:** when you set money aside, you can name a *second* person. If your loved one receives the money but later can't keep checking in — for example, if they pass away — it automatically passes to that backup, enforced on Stellar the same way as the original safety net. See **[docs/SUCCESSION.md](./docs/SUCCESSION.md)**.

No wallets. No seed phrases. No blockchain words anywhere in the interface. Just a
mobile number, a 6-number PIN, and one reassuring button.

---

## Applying this to your repo (important)

Replace your repo contents with this project **cleanly** — don't extract on top of the old
files. In particular, make sure there is **no leftover `src/` folder and no second `pages/`
folder**: a stale `pages/` next to the app directory is what causes the
`Cannot find module '../../app/.../page.js'` build error. Quickest safe way:

```bash
# from your cloned repo, on a clean branch
git rm -r --quiet . 2>/dev/null; true      # clear tracked files
# copy everything from this project into the repo root, then:
git add -A && git commit -m "Sagip: root layout, wallet UI, demo mode"
git push
```

## Why this idea

Screened against the workshop’s “what not to build” guidance (escrow, lending,
crowdfunding, donations, voting, NFTs, tip jars, vaults, AI agents — all saturated),
Sagip is built on one of the **underused native primitives** the workshop explicitly
rewards: **claimable balances with time predicates**. It needs **no Soroban / no Rust**,
so it’s realistic to finish, and it maps perfectly to a stack of Next.js + Prisma +
PostgreSQL driven by the classic Stellar SDK.

It also solves a genuinely large, emotional Philippine problem — millions of OFW
families with no simple way to guarantee savings reach loved ones if something
happens — and it demos beautifully, because the check-in is an active, visible moment
that ends with the family actually receiving the money on-chain.

## How it works on Stellar (the honest, technical version)

Every safety net is a **claimable balance** with two claimants:

| Claimant | Predicate | Meaning in the app |
|----------|-----------|--------------------|
| The owner | `unconditional` | They can always take the money back, or “check in” by reclaiming and re-creating it |
| The family member | `not(beforeAbsoluteTime(unlockAt))` | Can receive it **only after** the check-in window lapses |

**Post-receipt guard** (when a backup beneficiary is set): after the primary receiver claims, a *second* claimable balance is created on their account:

| Claimant | Predicate | Meaning in the app |
|----------|-----------|--------------------|
| Primary receiver | `unconditional` | They keep the money while they check in |
| Backup person | `not(beforeAbsoluteTime(unlockAt))` | Can receive it **only after** the receiver's check-in window lapses |

- **Set aside money** → `createClaimableBalance`
- **“I’m okay” (check in)** → one atomic transaction: `claimClaimableBalance` (reclaim)
  + `createClaimableBalance` (recreate with a later unlock date)
- **Take back** → `claimClaimableBalance` to the owner
- **Family receives** → `claimClaimableBalance` to the family member, after `unlockAt`
- **Receiver check-in** (backup configured) → reclaim + recreate the post-receipt guard
- **Backup receives** → `claimClaimableBalance` to the backup, after the receiver's unlock lapses

The protocol itself enforces that the family can’t claim early — there’s no trusted
server deciding when money is released. Balance IDs are derived deterministically with
`transaction.getClaimableBalanceId(opIndex)`.

Accounts are **custodial**: Sagip creates and funds a testnet account for each user and
each loved one (via Friendbot) so non-technical, elderly family members can receive
money without managing anything. Secrets are encrypted with **AES-256-GCM** before they
touch the database.

> Under the hood this runs on **Stellar testnet** and holds **USDC** (stable value) for
> safety nets, with test XLM only for network fees. The UI keeps amounts as plain numbers
> and never shows technical units.

## Testnet, real transactions & the admin panel

- **It’s the live Stellar testnet.** Network settings are seeded in `prisma/seed.ts`
  (Horizon `horizon-testnet.stellar.org`, Friendbot `friendbot.stellar.org`, passphrase
  `Test SDF Network ; September 2015`). Accounts are auto-created and funded with test XLM
  via Friendbot — no real money. Explore or build transactions yourself at
  [lab.stellar.org](https://lab.stellar.org). Note: testnet is reset a few times a year,
  which wipes all accounts and history.
- **Transactions are real and verifiable.** Every set-aside, check-in, take-back and
  receive is a real transaction submitted to Horizon. The hash is stored and shown as a
  **View record ↗** link (to `stellar.expert/explorer/testnet`) in each safety net’s
  history and throughout the admin panel.
- **Admin panel with separate authentication.** Admins are a completely separate identity
  (username + email + password, own sessions) from app users. Set `ADMIN_USERNAME`,
  `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `.env`, run `npm run db:seed`, then sign in at
  **/admin/sign-in**. The panel (`/admin`) shows totals, the full transaction log with
  explorer links, every safety net, and every user (public keys only — secret keys are
  never exposed anywhere).
- **Wallet onboarding & management.** After sign-up, people choose **Create a new wallet**
  (guided flow with a one-time recovery-key reveal and save confirmation) or **I already
  have a wallet** (paste a recovery key; unfunded keys are activated automatically on
  testnet). The **Wallets** page supports multiple wallets: switch the active one (with a
  confirmation dialog), rename, add or import more, and reveal a recovery key behind a PIN
  check. Safety nets stay pinned to the wallet that created them, so check-ins keep working
  after switching.
- **Family tools hub.** Advanced features live at `/home/tools`, fully separate from the core
  flow: send-now gifts, scheduled gifts ("opens on a date"), tuition plans that open in parts,
  split safety nets across several loved ones, savings goals with progress bars, an abuloy
  preset, a printable QR claim card for each net/gift, an emergency "ask to open it now"
  request the sender approves or dismisses, check-in streaks, **backup beneficiaries**
  (post-receipt succession if the primary receiver can't keep checking in), and a **Paluwagan**
  MVP (invite-only savings circle). All of it reuses the same claimable-balance machinery —
  gifts are nets with an open date and no check-in.
- **Account management.** Users get a full account area: profile + photo, add/change email
  with 6-digit verification codes, change PIN (signs out other devices), forgot-PIN recovery
  via verified email, and multi-device session management with revocation. Email delivery
  uses SMTP configured via `SMTP_*` env vars (seeded into the database); without SMTP the
  app says clearly that email isn't set up rather than pretending to send.
- **Add funds.** The **Add funds** screen shows a receive address (with QR) that works on
  testnet and mainnet alike, plus an instant test top-up for trying the send/receive flow.
- **Live rates.** USDC (held asset) is valued in PHP, USD, EUR, SAR, AED, SGD, and HKD via CoinGecko
  (cached server-side, refreshed each minute), shown on balances and on the Add-funds screen.
- **End-to-end test.** `npm run e2e` funds a sender and recipient on testnet, sets money
  aside, receives it, and asserts balances + fees on-chain — proof the flow really works.

See **[docs/FUNDING.md](./docs/FUNDING.md)** for funding-sprint improvements (USDC, reminders,
CI, admin KPIs), **[docs/PRODUCTION.md](./docs/PRODUCTION.md)** for the full path-to-production plan (the biggest
items: integrate a **SEP-24 anchor** for real PHP deposit/cash-out (USDC holding is already implemented on testnet).

## Tech stack

| Layer | Choice |
|-------|--------|
| Monorepo | npm workspaces (`client-frontend` + `server-backend`) |
| Frontend | Next.js **16** (App Router), React **19**, Tailwind CSS 3 |
| Backend | Next.js **16** (Pages Router API), Prisma **6**, PostgreSQL |
| Blockchain | Stellar SDK — claimable balances on **testnet**, held asset **USDC** |
| Auth | Hand-rolled HS256 JWT + revocable sessions |
| Lint | ESLint 9 flat config (`eslint .` — `next lint` removed in Next 16) |
| CI | GitHub Actions — typecheck, lint, build, health smoke test, optional e2e |

Requires **Node 20.9+**.

## Architecture

This repo is an **npm workspaces monorepo** with two apps:

| App | Port | Role |
|-----|------|------|
| `client-frontend` | 8000 | Next.js App Router UI |
| `server-backend` | 8001 | Next.js Pages Router API + Prisma + Stellar |

The client proxies `/api/*` to the backend via Next.js 16 **`proxy.ts`** (reads `API_URL`), so the
browser still calls relative `/api/...` paths on **the same origin** — no CORS preflights in the
normal web app. The backend only emits CORS headers when `CORS_ORIGIN` is set (optional, for
direct cross-origin API access without the proxy).

Each workspace has its own **[client-frontend/README.md](./client-frontend/README.md)** and
**[server-backend/README.md](./server-backend/README.md)**. AI coding rules live in each workspace's
**`AGENTS.md`** / **`CLAUDE.md`**.

- **Simple, hand-rolled HS256 JWT** auth — tokens travel in the `Authorization` header.
- **Prisma + PostgreSQL** for persistence (lives in `server-backend/`).
- **Service classes everywhere.** Server domain logic in `server-backend/server/services/**`;
  client-side API calls in `client-frontend/services/**`.
- **Config & credentials in the database** (`Setting` table), not hard-coded.

```
client-frontend/
  app/                 App Router pages
  components/          Reusable UI
  services/            client-side API service classes
  proxy.ts             /api/* → server-backend (API_URL)
  lib/format.ts        display helpers

server-backend/
  pages/api/           HTTP endpoints (Pages Router)
  server/services/     domain logic (stellar, users, safety nets, …)
  lib/                 prisma, jwt, crypto, api guard
  prisma/              schema + seed
```

## Setup

Requires Node **20.9+** and a PostgreSQL database.

```bash
# 1. Install (root installs both workspaces)
npm install

# 2. Configure env files
cp server-backend/.env.example server-backend/.env
# Edit server-backend/.env — see that file for all variables (required + optional).
#
# Client (optional in dev — defaults work for localhost:8000 → :8001 proxy):
#   cp client-frontend/.env.example client-frontend/.env.local
#   API_URL only needed in production when backend is on a separate host.

# 3. Create the schema and seed Stellar network config
npm run setup

# 4. Run both apps
npm run dev
```

Open http://localhost:8000 (UI). The API runs at http://localhost:8001 and is proxied via `proxy.ts`.

### Development commands (repo root)

| Command | Purpose |
|---------|---------|
| `npm run dev` | Client `:8000` + server `:8001` |
| `npm run dev:client` / `dev:server` | One workspace only |
| `npm run build` | Production build (server first, then client) |
| `npm run typecheck` | TypeScript both workspaces |
| `npm run check` | Typecheck + lint (one command) |
| `npm run health` | Curl backend `/api/health` (server must be running) |
| `npm run setup` | Migrate + generate + seed backend |
| `npm run e2e` | Stellar testnet integration test |

### Production deploy notes

- Set **`API_URL`** on the client deployment to the public backend origin.
- Backend needs `DATABASE_URL`, `AUTH_TOKEN_SECRET`, `APP_ENCRYPTION_KEY`, and SMTP/CRON vars as needed.
- **CORS:** leave `CORS_ORIGIN` unset when the client proxies `/api` (recommended). Set it only if a browser app on another origin calls the API directly.
- Schedule **`POST /api/cron/reminders`** hourly with `Authorization: Bearer $CRON_SECRET` (see `.github/workflows/reminders-cron.yml`).

## A 3-minute demo script

The app has a **built-in demo mode**: when you create a safety net, choose
**“Every minute”** as the check-in frequency. That compresses the whole lifecycle —
set aside → check in → lapse → family receives — into a couple of minutes so you can show
it live. No code changes needed.

See **[docs/DEMO.md](./docs/DEMO.md)** for a full word-for-word script with timing and talking points,
**[docs/SUCCESSION.md](./docs/SUCCESSION.md)** for the backup-beneficiary flow (including the VC
"what if the receiver dies?" scenario), and **[docs/ONBOARDING.md](./docs/ONBOARDING.md)** for the plain-language “how to use the app” guide
(the same walkthrough is available in-app under **How it works**).

## What I deliberately left out

- **QR codes.** The family receives via a plain shareable link; a QR wrapper is a trivial
  future add, included only if it earns its place.
- **Soroban / smart contracts.** Not needed — native predicates do the job and keep the
  build honest and finishable.
