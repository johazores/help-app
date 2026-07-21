# Instawards Test Plan

This plan covers the current custodial lifecycle and the external-wallet work proposed in the SOW. Test results must include the command, environment, commit SHA, timestamp, outcome, and relevant transaction or balance identifiers.

## Current lifecycle regression

- Create a safety net and verify the claimant addresses, amount, asset, and unlock predicate.
- Check in through one atomic claim-and-recreate transaction.
- Take the renewed balance back as the owner.
- Create a second safety net, let the primary claimant become eligible, and claim it into a guarded balance.
- Renew the guarded balance through a receiver check-in.
- Let the guard expire and claim it as the backup beneficiary.
- Verify every successful transaction on Stellar Expert testnet.

## External-wallet functional coverage

- Connect Freighter and xBull on testnet.
- Reject public-network and unsupported-network connections.
- Prepare and sign asset-readiness, create, check-in, take-back, primary claim, receiver check-in, and backup claim transactions.
- Confirm no recovery key is accepted by the external-wallet endpoints.
- Verify the connected address matches the intended source or claimant.

## Transaction integrity coverage

- Reject a changed source account, network, asset, issuer, amount, claimant, unlock time, sequence number, memo, or operation count.
- Reject an expired transaction intent.
- Return the existing receipt for a repeated confirmed submission.
- Allow only one network submission when two requests race.
- On an unknown Horizon result, query by transaction hash before rebuilding.
- Recover the linked domain state when the chain confirms but the first database update fails.

## Failure and readiness coverage

- Missing XLM reserve.
- Missing trustline for a classic issued asset.
- Unfunded account.
- Horizon unavailable or timed out.
- Wallet cancellation and disconnect.
- Sequence changed between preparation and signing.
- Claim attempted before the protocol predicate is satisfied.
- Invalid or already claimed balance ID.
- Public claim route rate limit.

## Evidence outputs

The final test run must publish:

- the complete CI result;
- a machine-readable receipt manifest;
- a human-readable receipt table;
- decoded XDR examples;
- the rejected tamper and replay cases;
- the successful Freighter and xBull recordings;
- the primary and backup succession transaction chain.
