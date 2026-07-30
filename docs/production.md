# Path to Production

Sagip currently runs on Stellar testnet and is not ready to hold real customer funds.

## What works today

- Real testnet claimable-balance creation and claims.
- Sender check-ins and time-based family eligibility.
- Optional backup beneficiaries and post-receipt guards.
- Encrypted custodial recovery keys in the database.
- Wallet onboarding and management.
- Administrator transaction visibility.
- Testnet transaction hashes and public explorer links.
- Email verification, reminders, and account recovery when SMTP is configured.
- End-to-end testnet settlement validation.

## Testnet and simulated boundaries

- Test assets have no real monetary value.
- Friendbot funding is testnet-only.
- Fiat deposit and cash-out are not implemented.
- Exchange rates are informational.
- The server currently operates custodial accounts and must be treated as a trusted authority.
- Product operation depends on the application database, server availability, and configured signers.

## Production blockers

### Regulation and partners

- Licensed Philippine fiat on-ramp and off-ramp.
- Customer identity and compliance processes.
- Clear legal product classification.
- Consumer protection, dispute, and support procedures.

### Custody and security

- KMS or HSM-backed key storage and signing.
- Multisig and approval thresholds.
- Key rotation, recovery, and incident procedures.
- Independent application and custody security review.
- Rate limiting, abuse prevention, and operational alerts.

### Operations

- Mainnet asset and reserve management.
- Reconciliation between database and Stellar state.
- Failed and uncertain transaction recovery.
- Monitoring, backups, disaster recovery, and status communication.
- Customer support and claim-link recovery procedures.

### Product validation

- Research with OFW senders and family recipients.
- Accessibility and low-connectivity testing.
- Clear consent and explanation of check-in lapse behavior.
- Safe handling of phone loss, incapacity, disputes, and estate scenarios.

## Recommended sequence

1. Complete legal and partner discovery.
2. Define the production custody and trust model.
3. Implement regulated fiat rails in a separate reviewed phase.
4. Move signing to managed secure infrastructure.
5. Add reconciliation and incident tooling.
6. Complete independent security and operational reviews.
7. Run a controlled pilot before broader release.

Do not switch network settings to mainnet and describe the result as production-ready without completing these requirements.
