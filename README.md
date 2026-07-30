# Sagip

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-testnet%20prototype-orange.svg)](docs/production.md)
[![Stellar](https://img.shields.io/badge/Stellar-testnet-7D00FF.svg)](docs/security.md)

**Money set aside for the people you love.**

Sagip is a Stellar testnet family safety savings prototype. A sender sets aside funds for a loved one and keeps them while completing periodic check-ins. When the check-in window lapses, the chosen loved one becomes eligible to receive through a Stellar claimable balance.

An optional backup beneficiary adds a second post-receipt safety layer when the primary receiver later stops checking in.

> **Important:** Sagip uses Stellar testnet assets with no real monetary value. It is not ready to hold real customer funds and is not a will, insurance product, estate service, or regulated financial service.

## Product flow

1. A sender creates or imports a Stellar testnet wallet.
2. The sender adds a loved one and optional backup person.
3. The sender creates a safety net with an amount and check-in interval.
4. Stellar records a claimable balance with time predicates.
5. The sender periodically taps **I am okay** to refresh the eligibility date.
6. The sender may take the funds back while eligible.
7. If the sender stops checking in, the loved one uses the claim link to receive.
8. When a backup is configured, the primary receiver may enter a second guarded check-in stage.

## Why Stellar

Sagip uses native claimable balances rather than a custom smart contract.

| Claimant | Predicate | Meaning |
| --- | --- | --- |
| Sender | Unconditional | The sender may take the funds back or refresh the safety net |
| Loved one | Time-locked | The loved one may receive after the check-in window lapses |

For a post-receipt guard, the primary receiver becomes the unconditional claimant and the backup person becomes the time-locked claimant.

Stellar enforces claim eligibility. The application coordinates accounts, links, sessions, settings, reminders, and transaction records.

## Current capabilities

### Core safety net

- Testnet account creation and funding
- Set-aside and take-back flows
- Periodic sender check-ins
- Family claim links and mobile-number recovery
- Optional backup beneficiaries
- Post-receipt receiver check-ins
- Public testnet transaction receipts
- One-minute demo lifecycle

### Wallet and account management

- Guided wallet creation and import
- One-time recovery-key reveal and confirmation
- Multiple wallets with active-wallet selection
- Wallet rename and recovery-key reveal behind PIN verification
- Profile photo and account details
- Email verification and PIN recovery
- Multi-device session management and revocation

### Family tools

- Immediate and scheduled gifts
- Tuition release plans
- Split safety nets
- Savings goals
- Claim cards and QR links
- Emergency early-open requests
- Check-in streaks
- Backup beneficiaries
- Paluwagan prototype

### Administration

- Separate administrator authentication
- User and safety-net visibility
- Transaction history with explorer links
- Public-key visibility without recovery-key exposure
- Runtime settings and operational configuration

## Trust and custody

Sagip currently creates custodial testnet accounts for users and loved ones.

- Recovery keys are encrypted before database storage.
- Trusted server operations can use those keys to sign required transactions.
- The database coordinates user accounts, claim links, sessions, settings, and transaction state.
- Stellar testnet may reset accounts and history.
- Real fiat movement is not implemented.

Read the [security policy](docs/security.md) and [path to production](docs/production.md).

## Technology

| Layer | Technology |
| --- | --- |
| Monorepo | npm workspaces |
| Frontend | Next.js 16 App Router, React 19, Tailwind CSS |
| Backend | Next.js 16 Pages Router API, Prisma 6, PostgreSQL |
| Blockchain | Stellar SDK and claimable balances on testnet |
| Authentication | Signed JWT sessions with revocable session records |
| Email | SMTP-based verification, recovery, and reminders |
| Testing | TypeScript checks, linting, repository audits, and testnet end-to-end settlement |

Requires Node.js 20.9 or newer.

## Architecture

```text
client-frontend/          Next.js user interface
  app/                    pages and layouts
  components/             reusable UI
  services/               client API services
  proxy.ts                same-origin API proxy

server-backend/           Next.js API and domain services
  pages/api/              HTTP endpoints
  server/services/        safety net, wallet, user, reminder, and Stellar logic
  lib/                    Prisma, JWT, encryption, and API guards
  prisma/                 PostgreSQL schema and seed data

docs/                    product, security, demo, roadmap, and production docs
```

The browser calls relative `/api` paths through the client proxy. Domain logic remains in server services, while Stellar transaction intent and hashes are persisted before submission where required.

## Requirements

- Node.js 20.9 or newer
- PostgreSQL database
- Stellar testnet access
- SMTP configuration for email verification and reminders

## Installation

```bash
npm install
cp server-backend/.env.example server-backend/.env
```

Configure the required database, authentication, encryption, and testnet values. Then run:

```bash
npm run setup
npm run dev
```

Open:

```text
http://localhost:8000
```

The API runs on port `8001` and is proxied by the frontend.

## Validation

```bash
npm run typecheck
npm run lint
npm run check
npm run build
npm run e2e
```

The end-to-end command writes real transactions to Stellar testnet and should be run only with the intended test configuration.

## Production limitations

Before real funds or mainnet use, Sagip requires:

- a licensed fiat on-ramp and off-ramp;
- legal and regulatory assessment;
- KMS or HSM-backed signing;
- multisig, key rotation, and recovery procedures;
- reconciliation and transaction-recovery operations;
- monitoring, rate limiting, and incident response;
- independent application and custody security review;
- customer support and dispute procedures;
- controlled pilot validation.

Do not switch to mainnet and describe the result as production-ready without completing this work.

## Documentation

- [Documentation index](docs/index.md)
- [User onboarding](docs/onboarding.md)
- [Demo guide](docs/demo.md)
- [Backup beneficiary and succession](docs/succession.md)
- [Funding and partner readiness](docs/funding.md)
- [Path to production](docs/production.md)
- [Roadmap](docs/roadmap.md)
- [Changelog](docs/changelog.md)
- [Contributing](docs/contributing.md)
- [Security policy](docs/security.md)
- [Code of conduct](docs/code-of-conduct.md)
- [Repository metadata](docs/repository-metadata.md)

## License

MIT. See [LICENSE](LICENSE).

## Author

Created and maintained by [Johanssen Azores](https://github.com/johazores).
