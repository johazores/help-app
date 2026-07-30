# Security Policy

Sagip is testnet software and is not ready to hold real customer funds.

## Reporting

Do not open a public issue for vulnerabilities involving recovery keys, custodial accounts, authentication, claim links, transaction signing, encryption, personal data, or administrator access.

Contact the maintainer through the GitHub profile with a sanitized reproduction, affected route or transaction, expected behavior, actual behavior, and potential impact.

## Current trust boundaries

- Sagip creates and operates custodial Stellar testnet accounts for users and loved ones.
- Recovery keys are encrypted before database storage but are accessible to trusted server operations.
- The database owns user accounts, claim links, settings, sessions, and transaction coordination.
- Stellar enforces claimable-balance time predicates.
- Email, exchange rates, reminders, and fiat-style user-interface values are off-chain.
- Testnet accounts and history may be reset by the network.

## Safe development

- Use testnet assets only.
- Never commit recovery keys, encryption keys, session secrets, SMTP credentials, or personal data.
- Keep secrets out of browser bundles and public logs.
- Use strong independent authentication secrets for users and administrators.
- Validate recipient, ownership, amount, and transaction state server-side.
- Resolve uncertain Stellar submissions using stored transaction hashes.

## Before mainnet

Mainnet requires a separate security phase covering regulated partners, KMS or HSM signing, multisig policy, key rotation and recovery, reconciliation, monitoring, rate limiting, incident response, customer support, and an independent security review.
