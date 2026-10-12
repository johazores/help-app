# Testing

Sagip is tested at four levels. Each level is runnable locally and in CI, and the two
testnet suites publish machine-readable receipt manifests that anyone can check on
Stellar Expert.

| Suite | Command | Needs | What it proves |
| --- | --- | --- | --- |
| Unit | `npm test` | Nothing | Amount, phone, email and PIN validation; Horizon error mapping; secret encryption and tamper rejection; PIN hashing; session-token forgery rejection; startup secret checks |
| Database integration | `npm run test:integration` | PostgreSQL | Shared rate limiting: exact limits, concurrent attempts counted atomically, window expiry, hashed keys, pruning |
| Application lifecycle | `npm run test:lifecycle` | PostgreSQL, Stellar testnet | Sagip's own service layer end to end (details below) |
| Protocol lifecycle | `npm run e2e` | Stellar testnet | The claimable-balance design with hand-built transactions, independent of the application |

Run every command from the repository root. The database suites read
`server-backend/.env`; CI sets the same variables explicitly.

## Application lifecycle

`server-backend/tests/lifecycle/app-lifecycle.test.ts` signs up a sender, creates a
custodial wallet, adds a primary and a backup loved one, and then calls the same service
methods the API uses. Every step is read back from Horizon, not only from the database.

Sender scenario:

1. Set aside 25 and verify the on-chain claimable balance: amount, asset and both claimants.
2. Reject a claim before the unlock time.
3. Check in through one atomic claim-and-recreate transaction; the old balance is gone and
   the new one has a later unlock time.
4. Take the money back; a second take-back and a late claim are both rejected.
5. Try to set aside more than the wallet holds and confirm the person is told there isn't
   enough money (Horizon `op_underfunded`), not asked to retry.

Succession scenario:

1. Set aside 30 with a backup and a one-minute post-receipt window.
2. Find the claim link with the receiver's and sender's numbers; a wrong sender number
   finds nothing.
3. The loved one asks to open early and the sender approves.
4. The primary receives into a guarded balance whose claimants include the backup.
5. A second claim and an early backup claim are rejected.
6. The primary checks in, renewing the guard.
7. After the window lapses, the backup receives; their balance rises by the full amount and
   a second backup claim is rejected.

Confirmed transactions are written to `server-backend/artifacts/app-lifecycle-receipts.json`.

## Browser verification

Each release is also exercised in Chromium against a production build of the web app with
its content security policy enforced: sign-up, wallet creation, adding loved ones, setting
money aside with a backup, check-in, opening the claim link as the loved one, receiving,
taking money back, and recovering a lost link. The run must finish without console or page
errors.

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request:

1. Install, migrate, and verify the database sync repairs incomplete test funding.
2. Typecheck, lint, unit tests, database integration tests, and production builds.
3. Start the API and smoke-test sign-up, wallet creation, test funding, deposit info and
   currency rates.
4. Run both testnet lifecycles and upload `sagip-instawards-receipts` containing both
   receipt manifests.

## Adding tests

- Pure logic belongs in `server-backend/tests/unit/` and must not need a network or database.
- Anything that moves money should extend the application lifecycle so it is proven on
  testnet through the real service layer.
- Tests use Node's built-in `node:test` runner through `tsx`; no extra test framework is
  installed.
