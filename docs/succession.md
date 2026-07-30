# Backup beneficiary and succession

Sagip solves two related fears:

1. **The sender stops checking in** and the money opens to the named loved one.
2. **The loved one receives the money but later cannot keep checking in** and the money passes to a backup person chosen by the sender.

## If the receiver passes away after receiving

### With a backup person configured

1. The primary receiver taps **Receive** and the money enters a post-receipt guard on Stellar.
2. While able, the primary receiver taps **I am okay** to keep the money assigned to them.
3. If they stop checking in, the guard window eventually lapses.
4. The backup person opens the same claim link and receives the money.
5. Stellar enforces the timing rather than Sagip staff or a manual certificate review.

Sagip does not verify death on-chain. Succession uses the same check-in-lapse model as the original safety net. This can cover death, incapacity, loss of access, or another reason the receiver can no longer act.

### Without a backup person

If no backup was configured, the primary receiver keeps the money after receiving it. Sagip does not provide an automatic second recipient in the current version.

## Plain-language flow

### Stage 1: sender to primary receiver

- The sender checks in while the money remains theirs.
- When the check-in window lapses, the money opens to the primary receiver.
- The primary receiver uses the claim link.

### Stage 2: primary receiver to backup

When a backup is configured:

- Receiving creates a second Stellar safety net under the primary receiver.
- The primary receiver continues periodic check-ins.
- If the primary receiver stops checking in, the money opens to the backup person.
- The backup uses the same claim link when eligible.

Without a backup, receiving completes the original safety net with no additional check-ins.

## Stellar implementation

Each stage uses claimable balances with time predicates rather than a smart contract.

| Stage | Claimants | Purpose |
| --- | --- | --- |
| Original safety net | Sender unconditional, primary receiver time-locked | Sender check-in model |
| Post-receipt guard | Primary receiver unconditional, backup time-locked | Receiver check-in model |

When the primary receiver claims with a backup configured, one atomic transaction claims the original balance and creates the guarded balance.

A primary receiver check-in reclaims and recreates the guarded balance with a later unlock date. A backup claim becomes valid after the guard window lapses.

## Setup

1. Add separate primary and backup loved ones.
2. Enable **Add a backup person** while creating a safety net.
3. Select the backup and the post-receipt check-in frequency.
4. Share the claim link with the primary receiver and make sure the backup knows how to access it.

## Statuses

| Status | Meaning |
| --- | --- |
| Watching over | Sender check-ins are active |
| Open to family | Primary receiver may claim |
| Received, guarded | Primary received and post-receipt check-ins are active |
| Received by backup | Backup claimed after the guard opened |
| Received | Primary received without a backup |

## Demo

Use the one-minute check-in option for both stages to demonstrate sender lapse, primary receipt, primary lapse, and backup receipt in a short session.

## Limitations

- Check-in lapse is not legal death verification.
- Sagip is not a replacement for a will or estate process.
- The current version supports one backup per safety net.
- The full guarded amount passes to the backup rather than a partial amount.

## Lost phone after receiving

The funds are stored on Stellar rather than on the phone. Access can be recovered by asking the sender to share the link again, using claim recovery with the saved mobile number, or using a printed QR claim card.

A guarded primary receiver should keep the link in more than one safe place because a missed check-in may allow the backup to claim after the configured window.

## API endpoints

| Method | Path | Actor | Action |
| --- | --- | --- | --- |
| `POST` | `/api/safety-nets` | Sender | Create with optional backup recipient |
| `POST` | `/api/claim/:code` | Primary | Receive and create guard when configured |
| `POST` | `/api/claim/:code/check-in` | Primary | Post-receipt check-in |
| `POST` | `/api/claim/:code/backup` | Backup | Receive after the guard opens |
| `POST` | `/api/claim/recover` | Public | Recover links using the loved one's mobile number |
