# Demo Guide

This guide presents Sagip in about three minutes using plain language and Stellar testnet assets.

## One-line story

Sagip lets a person set money aside for someone they love. The money remains theirs while they keep checking in, but it opens to the chosen family member if the check-in window lapses.

## Before the demo

- Use a clean test account and testnet assets only.
- Confirm the sender and recipient wallets are funded.
- Use the one-minute check-in option.
- Confirm the health endpoint and Stellar testnet connection.
- Keep a transaction explorer tab available.
- Do not describe test assets as real money.

## Demo flow

### 1. Create a safety net

Show the sender choosing a loved one, amount, and one-minute check-in interval. Explain that the sender can still take the money back while the safety net is active.

### 2. Show the on-chain record

Open the created safety net and show the transaction hash and Stellar testnet explorer record.

### 3. Check in

Tap **I am okay** and explain that Sagip atomically refreshes the on-chain time condition.

### 4. Let the window lapse

Wait for the short demo interval. Show that the loved one becomes eligible to receive.

### 5. Receive

Open the claim link as the loved one and complete the testnet claim. Show the resulting transaction record.

### Optional succession flow

When a backup person is configured, demonstrate the primary receiver claiming into a post-receipt guard, missing their own check-in, and the backup becoming eligible.

## Important statements

- This demonstration uses Stellar testnet.
- The assets have no real monetary value.
- Real peso deposit and withdrawal require licensed partners.
- Sagip uses claimable balances and time predicates, not a custom smart contract.
- Check-in lapse is not legal death verification.

## Questions to prepare for

- Why does the sender keep unconditional access?
- What happens when a phone is lost?
- What happens when the receiver later cannot act?
- Who controls the server-held keys?
- What is still required before mainnet or real funds?

Use [production.md](production.md), [security.md](security.md), and [succession.md](succession.md) for detailed answers.
