# Instawards integration and verification guide

This guide covers the current Sagip testnet evidence flow. The existing application is custodial. The external-wallet flow remains proposed work until its implementation and public receipts are complete.

## Repository checks

```bash
npm ci
npm run typecheck
npm run lint
npm run build
```

## Current lifecycle evidence

Run from the repository root:

```bash
npm run e2e
```

The test creates fresh testnet accounts and verifies safety-net creation, owner check-in, owner take-back, primary receipt into a guarded balance, receiver check-in, and backup receipt.

The test writes:

```text
server-backend/artifacts/instawards-receipts.json
```

CI uploads the same file as `sagip-instawards-receipts`. Each record contains the transaction hash, Stellar Expert URL, source account, balance ID, scenario, action, and confirmation time.

## Evidence review

For every receipt:

1. Open the Stellar Expert testnet URL.
2. Confirm the source account and successful result.
3. Confirm the operation sequence.
4. For creation, verify the claimant addresses and time predicate.
5. For check-in, verify a claim is followed by a new claimable balance.
6. Compare the balance IDs with the manifest.

Rejected tests belong in the test report and are not counted as successful activity.

## Proposed transaction contract

A prepare response must include the intent ID, network, source public key, unsigned XDR, XDR hash, expiry, normalized operations, and readable review data.

A submit request must accept the intent ID and signed XDR only. It must reject changes to the source, network, sequence, time bound, asset, amount, claimant, unlock time, memo, or operation count. A repeated confirmed submission must return the existing receipt.

The final walkthrough must show Freighter and xBull connecting on testnet, rejecting the wrong network, reviewing the transaction, signing locally, submitting it, and opening the matching receipt.

This guide does not establish mainnet or real-money readiness. Those items remain outside the sprint.
