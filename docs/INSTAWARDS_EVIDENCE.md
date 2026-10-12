# Instawards Evidence Register

This register separates the Sagip features that exist today from the work proposed for the Instawards sprint. A feature is complete only when a reviewer can open its code, live URL, CI run, or Stellar Expert receipt.

## Current evidence

| Item | Evidence | Status |
| --- | --- | --- |
| Public source | Repository root | Available |
| License | `LICENSE` | MIT |
| Frontend | `client-frontend/` | Implemented |
| Backend | `server-backend/` | Implemented |
| Stellar operations | `server-backend/server/services/stellar-service.ts` | Implemented |
| Safety-net lifecycle | `server-backend/server/services/safety-net-service.ts` | Implemented |
| Protocol testnet lifecycle | `server-backend/scripts/e2e-test.ts` | Implemented |
| Application testnet lifecycle | `server-backend/tests/lifecycle/app-lifecycle.test.ts` | Implemented |
| Unit and database tests | `server-backend/tests/unit/`, `server-backend/tests/integration/` | Implemented |
| Receipt manifests | CI artifact `sagip-instawards-receipts` (both lifecycles) | Implemented |
| Public activity figures | `GET /api/stats`, trust page | Implemented |
| Health monitoring | `GET /api/health` (database query and Horizon reachability) | Implemented |
| Test guide | `docs/testing.md` | Available |
| CI | `.github/workflows/ci.yml` | Public |

## What the current code proves

The current custodial testnet path implements:

- claimable-balance creation;
- sender check-in through one atomic claim-and-recreate transaction;
- sender take-back;
- primary beneficiary receipt;
- post-receipt guarding and backup-beneficiary receipt;
- classic issued-asset trustline preparation when configured;
- Horizon submission and transaction-hash storage.

The application lifecycle suite runs these steps through Sagip's own service layer and
also verifies the rejections: a claim before the unlock time, a second claim, a backup
claim before the guard lapses, an underfunded set-aside, and claim-link recovery with the
wrong sender number.

The current path is custodial and signs on the server. It is not described as non-custodial.

## Proposed sprint work

These items are not complete at application time:

- persisted transaction intents and confirmed receipts;
- unsigned XDR prepare endpoints;
- exact signed-XDR validation and idempotent submission;
- Stellar Wallets Kit integration;
- Freighter and xBull signing;
- externally signed sender and recipient flows;
- external-wallet asset, fee, and reserve readiness checks;
- the final receipt manifest, integration guide, and technical walkthrough.

## Evidence required at completion

| Deliverable | Public evidence |
| --- | --- |
| D1 | PR, commit, API examples, decoded XDR, tests, and CI run |
| D2 | Freighter and xBull recordings plus create, check-in, and take-back receipts |
| D3 | Primary receipt, receiver check-in, and backup receipt chain with balance IDs |
| D4 | Technical video, integration guide, tagged release, test report, and receipt manifest |

## Receipt manifest rules

Every successful transaction counted in the SOW must include its action, network, transaction hash, Stellar Expert URL, source account, related balance ID, test-case reference, and confirmation time. Rejected test envelopes belong in the test report and are not counted as successful activity.

## Submission checks

- [ ] Live dApp and health endpoint work from a signed-out browser.
- [ ] The deployment shows the actual testnet network and held asset.
- [ ] The Ambassador Chapter Lead reviewed the final SOW.
- [ ] The Chapter Lead accepted the monorepo structure in writing.
- [ ] Every SOW claim has a code, commit, URL, CI, or receipt reference.
- [ ] Mainnet, real-money, anchor, KYC, and audit work remain out of scope.
- [ ] The final validation package is public.

## Known limitations

Sagip is testnet software. The current custodial path remains centralized. A regulated anchor, production custody controls, mainnet deployment, and an independent security review are separate future phases.
