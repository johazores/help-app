# Contributing

Thank you for helping improve Sagip.

## Current status

Sagip is a Stellar testnet prototype. Contributions must not describe the project as ready for real customer funds, mainnet custody, insurance, estate planning, or regulated financial use.

## Setup

```bash
npm install
cp server-backend/.env.example server-backend/.env
npm run setup
npm run dev
```

Use testnet accounts and disposable development data.

## Development principles

- Keep blockchain terminology out of the core family journey where possible.
- Preserve the same claimable-balance rules in UI, API, database, and tests.
- Keep wallet recovery keys encrypted and server-only.
- Keep administrator authentication separate from user authentication.
- Record transaction intent before submission and reconcile uncertain writes by hash.
- Mark simulated fiat behavior and test assets clearly.
- Keep runtime settings database-backed when they are administrator-managed.
- Do not add or modify GitHub Actions without a separate workflow and cost review.

## Branches and commits

Use `feat/<feature-name>` branches and focused Conventional Commits.

## Pull requests

Include what changed, why it changed, testing performed, custody or trust impact, documentation changes, and breaking changes.
