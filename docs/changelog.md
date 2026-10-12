# Changelog

Notable project and repository changes are documented here.

## Unreleased

### Security

- Rate limits are stored in PostgreSQL, shared by every server instance, keyed on normalized
  phone numbers (no more bypass by reformatting a number) and on the real visitor IP behind
  the web proxy. Added limits to wallet and loved-one creation and test top-ups.
- Claim-link recovery requires both the receiver's and the sender's mobile numbers.
- The cron endpoint refuses to run in production without its secret.
- Sign-in timing no longer reveals which numbers or admin usernames exist.
- Content security policy and HSTS on the web app; API responses are never cached.
- The API validates its secrets at startup.

### Fixed

- Check-ins, early opening and guarded receipt now keep a safety net in the asset it was
  created with, even if the configured asset changes.
- Stellar rejections are explained (not enough money, already updated, not open yet,
  still confirming) instead of a generic "try again".
- Paluwagan payments can no longer be paid twice by a double tap.
- A loved one is no longer told a claim failed when it succeeded.
- Two money actions can no longer run at once on a safety net; tuition plans never create
  a part twice after a partial failure; the backup can't equal the main receiver.
- `npm run setup` now reads `.env` when seeding.

### Added

- Unit, database integration and application-lifecycle test suites, run in CI.
- Public aggregate activity figures with verifiable receipts on the trust page.
- Accessible dialogs, masked PIN fields, labelled forms, announced loading and results,
  and WCAG AA contrast fixes.
- Health check that pings Horizon; structured JSON logs with request ids.

- Open-source contribution, security, roadmap, conduct, metadata, and documentation index files.
- Kebab-case user, demo, production, funding, and succession documentation.

### Changed

- Clarified Sagip as a Stellar testnet prototype rather than a real-funds product.
- Improved separation between implemented testnet settlement, simulated fiat behavior, and production requirements.

## Current prototype milestone

### Added

- Sender check-in safety nets using Stellar claimable balances.
- Family claims after time predicates become eligible.
- Backup beneficiaries and post-receipt guards.
- Custodial wallet onboarding and encrypted recovery-key storage.
- Multi-wallet management and claim-link recovery.
- Separate administrator authentication and transaction visibility.
- Testnet transaction receipts and end-to-end settlement validation.
- Reminders, profile management, email verification, and session controls.

### Limitations

- No licensed peso deposit or cash-out integration.
- No mainnet custody controls.
- No independent production security review.
- Check-in lapse is not legal death verification.
