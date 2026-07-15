# Sagip Real-World Readiness

## Product position

Sagip should not be positioned as another general wallet. Its strongest wedge is a **family-readiness platform for Filipinos who support loved ones from far away**, especially OFWs and distributed families.

The core job is:

> Help a family agree, before an emergency, who receives support, under what conditions, and how they can access it.

The Stellar check-in safety net is the technical primitive. The investable product is the complete family workflow around it:

1. Prepare trusted people and recovery contacts.
2. Choose a family purpose.
3. Set clear rules and backup recipients.
4. Share private claim instructions.
5. Check in and review the plan.
6. Resolve claims, exceptions, and support cases transparently.

## Why this market is credible

The Philippines has a large, durable remittance economy. BSP projections reported in June 2025 expected overseas Filipino remittances to reach approximately USD 35.5 billion in 2025. That supports a large existing behavior: workers regularly set aside money for parents, children, education, emergencies, housing, and community obligations.

Sagip should not compete first on cheaper transfers. It should build on top of transfers by answering what most remittance products do not:

- What happens if the sender becomes unreachable?
- Which family member is authorized to receive support?
- Is there a backup person?
- Does the family understand the claim process?
- Can everyone verify what happened?
- Can support be scheduled for tuition, gifts, funeral costs, or several dependants?

## Trust principles

### 1. Never hide the environment

Every screen involving value should clearly show whether it is testnet, sandbox, or production.

Current testnet balances must never be described as deposits, insured savings, investments, or guaranteed coverage.

### 2. Describe custody honestly

Sagip currently stores encrypted custodial signing keys. Encryption at rest is important, but it does not remove operator responsibility or custody risk.

Production requirements:

- HSM, MPC, or equivalent separated signing controls.
- No single application server or employee able to move customer funds alone.
- Documented key rotation, backup, restoration, and revocation procedures.
- Independent custody and application security assessment.
- Transaction limits, velocity controls, and high-risk action review.
- Published incident response and customer notification process.

### 3. A missed check-in is a trigger, not proof

A missed check-in does not prove death, incapacity, detention, illness, or an emergency.

The UI and terms should explain this clearly. Users should be encouraged to:

- choose a reasonable interval;
- add a backup recipient;
- review plans regularly;
- keep claim instructions private;
- use legal estate documents separately where appropriate.

### 4. Make every important action explainable

Before confirmation, show:

- amount and asset;
- recipient and backup;
- check-in interval;
- exact opening time;
- whether the action is reversible;
- fees and conversion rates;
- custody and counterparty;
- what happens if Sagip is unavailable.

After confirmation, show a human-readable receipt plus the independent Stellar transaction reference.

### 5. Build complaints and exception handling into the product

A trusted financial product needs more than a contact email.

Required workflows:

- report an unauthorized action;
- report a compromised phone or recovery key;
- dispute recipient identity;
- request transaction investigation;
- report a deceased or incapacitated sender;
- freeze risky actions where legally and technically possible;
- communicate service incidents;
- track complaint status and resolution time.

## Regulatory direction

This is product planning, not legal advice. Philippine counsel and regulated partners must determine the final operating model.

BSP Circular No. 1108 treats businesses that transfer, exchange, safeguard, or administer virtual assets for others as regulated VASP activities. It emphasizes wallet security, customer due diligence, financial consumer protection, clear risk disclosures, complaints handling, IT risk, outsourcing oversight, and business continuity.

The practical path for Sagip should be **partner-first**, not pretending the product can independently launch real-money custody and cash-out.

Recommended model:

- Sagip owns the family-plan experience and orchestration.
- A licensed VASP, EMI, bank, remittance company, or anchor performs regulated custody, fiat deposit, conversion, and withdrawal functions.
- Contracts define safeguarding, reconciliation, complaints, fraud losses, uptime, incident handling, and customer ownership.
- Sagip displays the regulated provider and fees before every transaction.

## Stellar interoperability roadmap

### SEP-24: fiat deposit and withdrawal

Use SEP-24 with a vetted anchor or regulated partner for interactive fiat on/off-ramp flows. The standard supports deposit, withdrawal, fees, KYC, status, and transaction history.

Product requirements:

- show the anchor identity and jurisdiction;
- show fees and indicative or firm quotes before confirmation;
- support transaction status and recovery from interrupted flows;
- test mobile redirects and callbacks;
- verify signed callbacks and freshness;
- keep a sandbox partner for demos.

### SEP-10: account authentication

Use SEP-10 or the appropriate successor authentication standard when connecting user-controlled Stellar accounts to partner services.

### SEP-12: KYC and data control

Use SEP-12-compatible partner flows where possible. Important product requirements include idempotent customer updates, status visibility, minimum necessary data, retention rules, and complete data erasure where legally allowed.

### SEP-30 or stronger multi-party recovery

Evaluate SEP-30 concepts or a production-grade multi-party recovery design so one Sagip server is not the only recovery authority.

Recovery should support:

- more than one independent recovery provider;
- verified email and phone identities;
- cooling-off periods for sensitive recovery actions;
- notifications to existing trusted devices;
- recovery cancellation when fraud is reported;
- audit records for every recovery attempt.

## Family tools strategy

The family tools should feel like parts of one family plan, not unrelated features.

### Core safety net

Primary wedge. Optimize for:

- one sender;
- one primary recipient;
- optional backup;
- understandable check-in interval;
- private claim instructions;
- recurring plan review.

### Split safety net

Target use case: OFWs supporting parents, spouse, and children.

Add later:

- percentage-based allocation;
- minimum amount per recipient;
- allocation preview;
- recipient acknowledgement;
- proof that every person received instructions.

### Tuition plan

High-value recurring use case.

Add later:

- school and student details;
- semester templates;
- due-date reminders;
- direct payment partner option;
- receipt upload;
- unused-fund handling rules.

### Planned gifts

Useful for adoption and emotional engagement.

Add later:

- personal message;
- reveal date and timezone clarity;
- sender cancellation policy;
- recipient notification preferences;
- gift receipt.

### Abuloy and emergency support

Strong Filipino cultural fit, but sensitive.

Add later:

- clear purpose and spending guidance;
- multiple family coordinators;
- contribution history;
- transparent disbursement record;
- fraud reporting;
- no implication that Sagip verifies a death or emergency.

### Paluwagan

Potentially high engagement but highest social and dispute risk.

Do not scale until the product includes:

- member identity and explicit consent;
- written group rules;
- contribution reminders;
- grace periods and late-payment policy;
- admin removal and freeze procedures;
- dispute handling;
- clear statement that Sagip does not guarantee other members' payments;
- transaction and payout reconciliation.

## Product roadmap

### Phase 0: trusted testnet product

- Persistent testnet labeling.
- Public trust center.
- Accurate custody disclosure.
- Family readiness checkup.
- Remove absolute safety and delivery claims.
- Private claim-card guidance.
- Product analytics for setup completion.
- Security checklist mapped to OWASP ASVS 5.

### Phase 1: closed real-money pilot with partner

- Licensed partner selected.
- SEP-24 or equivalent deposit/withdrawal integration.
- KYC, sanctions, AML, fraud, and transaction monitoring owned with partner.
- Production custody controls.
- Independent penetration and custody assessment.
- Customer support and complaints system.
- Transaction limits and manual review.
- Pilot restricted by country, amount, and invited users.

### Phase 2: family operations platform

- Recipient consent and verification.
- Trusted-device notifications.
- Multi-party recovery.
- Plan review reminders.
- Family activity feed.
- Shareable but privacy-safe family instructions.
- Tuition and emergency partner integrations.
- Paluwagan controls and reconciliation.

### Phase 3: distribution and revenue

Potential channels:

- OFW employers and staffing agencies;
- remittance companies;
- banks and digital banks;
- insurers and assistance providers;
- cooperatives and credit unions;
- migrant-worker organizations;
- payroll and benefits platforms.

Potential revenue:

- family premium subscription;
- B2B2C per-active-family fee;
- regulated partner revenue share;
- employer-sponsored family protection benefit;
- white-label family-readiness platform;
- API fees for family instructions and conditional disbursement orchestration.

Avoid revenue based on hidden spreads, confusing fees, breakage, or users failing to claim.

## Investor-ready metrics

### Activation

- verified email rate;
- loved-one creation rate;
- first safety-net completion rate;
- backup-recipient rate;
- claim instruction viewed or printed rate;
- time from sign-up to family-ready.

### Engagement

- successful check-in rate;
- monthly active protected families;
- plan review completion;
- family tool adoption by use case;
- reminder delivery and action rate.

### Trust and operations

- unauthorized-action reports;
- recovery success rate;
- complaint resolution time;
- support contact rate per active family;
- transaction reconciliation exceptions;
- security incidents and time to contain;
- partner uptime and failed cash-in/cash-out rate.

### Outcome

- successful recipient claims;
- median time from eligibility to receipt;
- failed or abandoned claims;
- amount delivered by family purpose;
- recipient satisfaction;
- percentage of claims with a verified backup path.

## Near-term engineering checklist

- [x] Public trust and safety page.
- [x] Persistent network badge.
- [x] Honest testnet and custody language.
- [x] Family readiness checkup.
- [x] Family tools organized by real-life need.
- [ ] Recipient consent and verification state.
- [ ] Claim-link rotation and revocation.
- [ ] Recovery attempt audit log.
- [ ] Trusted-device notifications.
- [ ] Support case and complaint model.
- [ ] Incident/status page.
- [ ] Security headers and ASVS automated checks review.
- [ ] Rate limits backed by Redis or another shared store.
- [ ] Transaction risk limits and manual review queue.
- [ ] Production custody architecture decision record.
- [ ] Licensed partner due-diligence checklist.
- [ ] SEP-24 sandbox integration.

## Primary references

- Bangko Sentral ng Pilipinas, Circular No. 1108, Guidelines for Virtual Asset Service Providers: https://www.bsp.gov.ph/Regulations/Issuances/2021/1108.pdf
- Stellar SEP-24, Hosted Deposit and Withdrawal: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md
- Stellar SEP-10, Stellar Web Authentication: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0010.md
- Stellar SEP-12, KYC API: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0012.md
- Stellar SEP-30, Multi-party Account Recovery: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0030.md
- OWASP Application Security Verification Standard 5.0: https://owasp.org/www-project-application-security-verification-standard/
