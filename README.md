# Sagip

**Money set aside for the people you love.**

Sagip lets someone — typically an overseas worker — set money aside for a specific
family member. As long as they periodically tap **“I’m okay,”** the money stays
entirely theirs; they can take it back at any moment. If they ever *stop* checking
in — hospitalised abroad, phone lost, or worse — the money automatically opens to
their chosen loved one on a date they set. It’s a safety net for savings, built for
the exact fear every OFW family lives with.

No wallets. No seed phrases. No blockchain words anywhere in the interface. Just a
mobile number, a 6-number PIN, and one reassuring button.

---

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

- **Set aside money** → `createClaimableBalance`
- **“I’m okay” (check in)** → one atomic transaction: `claimClaimableBalance` (reclaim)
  + `createClaimableBalance` (recreate with a later unlock date)
- **Take back** → `claimClaimableBalance` to the owner
- **Family receives** → `claimClaimableBalance` to the family member, after `unlockAt`

The protocol itself enforces that the family can’t claim early — there’s no trusted
server deciding when money is released. Balance IDs are derived deterministically with
`transaction.getClaimableBalanceId(opIndex)`.

Accounts are **custodial**: Sagip creates and funds a testnet account for each user and
each loved one (via Friendbot) so non-technical, elderly family members can receive
money without managing anything. Secrets are encrypted with **AES-256-GCM** before they
touch the database.

> Under the hood this runs on **Stellar testnet** and uses test XLM as stand-in “money.”
> The UI keeps amounts as plain numbers and never shows technical units.

## Architecture

- **Next.js App Router** renders every page (`src/app/**`).
- **Pages Router** is used **only** for API endpoints (`pages/api/**`).
- **Simple, hand-rolled HS256 JWT** auth (`src/lib/jwt.ts`) — no auth library. Tokens
  travel in the `Authorization` header, which behaves identically on mobile web and PWAs.
- **Prisma + PostgreSQL** for persistence.
- **Service classes everywhere.** Server domain logic lives in `src/server/services/**`;
  all client-side API calls live in `src/services/**`. No `fetch` calls scattered in pages.
- **Config & credentials in the database** (`Setting` table), not hard-coded. Only two
  true secrets stay in env: the token signing key and the 32-byte encryption key.
- **kebab-case** files and folders throughout.

```
src/
  app/                 App Router pages (landing, auth, dashboard, detail, claim)
  components/          Reusable UI (ui/* primitives + composites)
  lib/                 prisma, jwt, crypto, api guard, formatting
  server/services/     settings, stellar, user, recipient, safety-net
  services/            client-side API service classes
pages/api/             HTTP endpoints only
prisma/                schema + seed
```

## Setup

Requires Node 18+ and a PostgreSQL database.

```bash
# 1. Install
npm install

# 2. Configure — copy the example and fill in the three values
cp .env.example .env
#   DATABASE_URL         your Postgres connection string
#   AUTH_TOKEN_SECRET    node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
#   APP_ENCRYPTION_KEY   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 3. Create the schema and seed Stellar network config
npx prisma migrate dev --name init
npm run db:seed

# 4. Run
npm run dev
```

Open http://localhost:3000.

## A 3-minute demo script

1. **Get started** — create an account with any mobile number + 6-digit PIN.
2. **Set aside money** — add a loved one (e.g. “Nanay Elena / Mother”), name the net
   (“Monthly support”), enter an amount, and pick **“Every week.”**
   *(To make the whole lifecycle fit in a live demo, temporarily add a shorter option —
   e.g. `{ days: 0.003, label: "Demo (5 minutes)" }` — in `src/app/home/new/page.tsx`
   and allow it in the service validation.)*
3. **Check in** — open the net, tap **“I’m okay — check in,”** watch the lifeline ring
   reset. Point out this is a real Stellar transaction.
4. **Let it lapse** — once the window passes, the ring turns marigold and the net shows
   **“Open to family.”**
5. **Receive** — open the **share link** in another tab (this is the family’s view, no
   login), tap **“Receive,”** and show the money landing. Done.

## What I deliberately left out

- **QR codes.** The family receives via a plain shareable link; a QR wrapper is a trivial
  future add, included only if it earns its place.
- **Soroban / smart contracts.** Not needed — native predicates do the job and keep the
  build honest and finishable.
