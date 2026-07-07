# Paluwagan Feature Proposal

## Feasibility Verdict

Sagip can support a Paluwagan feature, provided it is built as a trust-based savings circle rather than an investment or public social feature.

The feature fits the current app because Sagip already has:

- Custodial wallets
- Scheduled money behavior
- Recipients and trusted relationships
- Activity history
- Admin oversight
- Planned reminders and notifications
- A Filipino-first financial safety-net positioning

The recommended approach is an invite-only Paluwagan module integrated with Sagip wallets. It should not be positioned as a profit, yield, lending, or investment product.

Regulatory caution is important. Online Paluwagan schemes have been associated with scams, and Philippine regulators may treat money movement, stored value, virtual assets, or payment orchestration as regulated activity depending on the final implementation. Before production launch with real money, Sagip should complete a legal and compliance review for BSP OPS, EMI, VASP, AML/KYC, consumer protection, and data privacy obligations.

Useful references:

- BSP Circular 1166, e-money rules: https://www.bsp.gov.ph/Regulations/Issuances/2023/1166.pdf
- BSP OPS registration FAQ: https://www.bsp.gov.ph/PaymentAndSettlement/FAQ_OPS_Registration.pdf
- BSP Circular 1108, VASP rules: https://www.bsp.gov.ph/Regulations/Issuances/2021/1108.pdf
- SEC advisory on Online Cash Paluwagan: https://appointment.sec.gov.ph/advisories-2013/sec-advisory-on-oneline-marketing-scheme-online-cash-paluwagan/
- Data Privacy Act: https://privacy.gov.ph/data-privacy-act/
- Paluwagan overview and risks: https://www.moneymax.ph/personal-finance/articles/paluwagan-system

## Recommended Product Positioning

Use "Paluwagan" in user-facing Filipino context, and "Savings Circle" in architecture and compliance-facing documentation.

Recommended placement: a dedicated advanced section that is separate from the existing Sagip safety-net flow.

Suggested route:

```txt
/home/paluwagan
```

The current Sagip experience should remain unchanged:

- Home stays focused on safety nets.
- `Set aside` continues to create the existing loved-one safety net.
- Loved ones, Wallets, Account, and Guide keep their current meaning.
- No Paluwagan steps should be inserted into onboarding, wallet setup, safety-net creation, or claim flows.

Paluwagan should live in its own section because it has a different mental model: groups, member acceptance, rotating payouts, due dates, and dispute handling. Keeping it separate protects the simplicity of the original Sagip promise while giving advanced users a cleaner place for group-saving functionality.

This is better than placing it only inside Wallets because Paluwagan has group lifecycle, members, schedules, contributions, payout order, reminders, and disputes. It is also safer than making it a community or social feature, because public discovery increases fraud, spam, and regulatory risk.

Recommended navigation:

```txt
Home | Loved ones | Set aside | Circles | Account
```

However, to preserve the original user experience, the first MVP should avoid replacing the current mobile nav immediately. Instead:

1. Add `Paluwagan` or `Circles` as a desktop top-nav item.
2. Add it to the mobile drawer.
3. Add a small secondary entry point from Wallets, such as `Savings circles`.
4. Do not replace the center `Set aside` action.

After usage is validated, the mobile tab bar can be reconsidered. If Paluwagan becomes a core feature, `Guide` can move to the drawer/help section and `Circles` can take its tab position. Until then, keep the bottom nav unchanged.

## Separation Strategy

The best overall UX and scalability approach is a dedicated module with shared infrastructure.

### UX Separation

Paluwagan should have its own landing page, creation flow, group detail page, and history. This keeps advanced functionality organized and avoids making the existing safety-net flow feel heavier.

Recommended page structure:

```txt
/home/paluwagan                 Paluwagan dashboard
/home/paluwagan/new             Create Paluwagan group
/home/paluwagan/[id]            Group detail and management
/home/paluwagan/[id]/contribute Contribution review
/paluwagan/invite/[code]        Public invite acceptance page
```

The existing pages should remain unchanged:

```txt
/home                           Existing safety-net dashboard
/home/new                       Existing set-aside flow
/home/[id]                      Existing safety-net detail
/claim/[code]                   Existing receiver claim flow
/home/people                    Existing loved-ones flow
/home/wallets                   Existing wallet flow
```

### Shared Infrastructure

Although the UX should be separate, Paluwagan should reuse existing platform services:

- Authentication
- Wallet lookup
- Stellar transaction service
- Mailer service
- Admin auth
- Activity/receipt patterns
- Formatting utilities
- AppShell visual language

This gives users a separate experience while keeping the architecture maintainable.

### Scalability Benefits

This approach scales well because:

- Safety nets and Paluwagan can evolve independently.
- Paluwagan can add richer group tooling without affecting the core flow.
- Admin controls can expand for groups without changing loved-one claims.
- Compliance controls can be stricter for Paluwagan groups.
- Future advanced modules can follow the same pattern.

Recommended long-term advanced section:

```txt
/home/advanced
  /paluwagan
  /shared-goals
  /family-vaults
  /scheduled-support
```

For MVP, do not create a generic advanced hub yet. Start with `/home/paluwagan`; introduce an advanced hub only when there is a second advanced feature.

## MVP Scope

The MVP should be simple, transparent, and production-minded.

Include:

- Invite-only Paluwagan groups
- 3 to 12 members per group
- Fixed contribution amount
- Weekly and monthly schedules
- Owner-defined payout order before activation
- Member acceptance of rules before activation
- Locked rules after the group starts
- Contributions from Sagip wallets
- Automatic payout only after all cycle contributions are confirmed
- Group progress tracking
- Contribution history and receipts
- Upcoming contribution reminders
- Overdue contribution reminders
- Upcoming payout notifications
- Admin freeze, cancel, and dispute review tools

Avoid in the MVP:

- Public group discovery
- Interest, yield, rewards, or "earn money" language
- Automated late fees
- Loans or credit scoring
- Complex group voting
- Marketplace-style community features
- Large group sizes
- High contribution limits

## User Flows

### Create A Group

1. User opens `Circles`.
2. User taps `Create Paluwagan`.
3. User enters group name.
4. User chooses contribution amount.
5. User chooses schedule: weekly or monthly.
6. User chooses start date.
7. User sets maximum members.
8. User invites members by phone number or invite link.
9. User sets payout order: manual, random, or first-joined.
10. User reviews all rules.
11. User confirms with PIN.
12. Group remains in draft/open state until members accept.

### Join A Group

1. Member opens invite link.
2. Member signs in or creates a Sagip account.
3. Member sees a plain-language rules summary.
4. Member reviews contribution amount, due dates, payout position, and total cycle length.
5. Member accepts rules.
6. Member chooses wallet.
7. Member pays the first contribution or confirms funding readiness.
8. Member becomes active in the group.

### Manage A Group

The group dashboard should show:

- Current cycle
- Next contribution due date
- Current payout recipient
- Members who have paid
- Members still unpaid
- Total pool amount
- Payout timeline
- Group activity
- Contribution receipts

Group owner actions:

- Send reminders
- Close invites
- Remove invited members before activation
- Start group when all members accept
- Request admin review

Member actions:

- Pay contribution
- View receipts
- View payout position
- Report an issue
- Leave before activation

### Complete A Group

1. Final cycle starts.
2. Final contributions are collected.
3. Final payout is released.
4. Group status becomes `COMPLETED`.
5. Members can view history and receipts.
6. Owner can duplicate the group for a new round.

## Roles And Permissions

### Group Owner

Can:

- Create a group
- Invite members
- Remove invited members before activation
- Set contribution amount before activation
- Set schedule before activation
- Set payout order before activation
- Start the group
- Send reminders
- Request admin review

Cannot:

- Change amount after activation
- Change payout order after activation
- Change schedule after activation
- Force payout before all required contributions are confirmed
- Move member funds outside group rules

### Members

Can:

- Join by invite
- Accept group rules
- Contribute from wallet
- View group status
- View payout order
- View receipts and history
- Report an issue
- Leave before activation

Cannot:

- Invite or remove other members unless they are the owner
- Change group rules
- Change payout order
- Trigger manual payout

### Admin

Can:

- View all groups
- View audit logs
- Freeze suspicious groups
- Cancel or close groups according to policy
- Resolve disputes
- Review fraud signals
- Enforce limits
- Block abusive users
- Support refunds where allowed

## Contribution Schedules

The system should support these schedule types in the data model:

- Daily
- Weekly
- Monthly
- Custom

Recommended MVP UI:

- Weekly
- Monthly

Daily and custom schedules should be reserved for later. Daily contributions increase missed-payment volume and support load.

Each group should generate its cycles up front when activated. This keeps payout order, due dates, and expected total contributions predictable.

## Automatic Payout Rotation

Simple MVP rule:

> The payout is released only when every required contribution for the current cycle is paid and confirmed.

Example:

- 5 members
- PHP 1,000 weekly contribution
- PHP 5,000 pooled payout
- Week 1 pays member in payout position 1
- Week 2 pays member in payout position 2
- Week 3 pays member in payout position 3
- The group completes after every member has received once

Recommended statuses:

Group:

- `DRAFT`
- `OPEN`
- `ACTIVE`
- `PAUSED`
- `COMPLETED`
- `CANCELLED`
- `DISPUTED`

Cycle:

- `UPCOMING`
- `COLLECTING`
- `READY_FOR_PAYOUT`
- `PAID_OUT`
- `OVERDUE`
- `FAILED`

Contribution:

- `DUE`
- `PENDING`
- `PAID`
- `LATE`
- `MISSED`
- `REFUNDED`

Payout:

- `SCHEDULED`
- `PROCESSING`
- `PAID`
- `HELD`
- `FAILED`

## Missed Payments And Late Contributions

The MVP should avoid automatic penalties. Instead, it should use clear reminders, grace periods, and admin review.

Recommended handling:

1. Send reminder before due date.
2. Send due-day reminder.
3. Mark contribution as late after deadline.
4. Apply grace period, such as 24 or 48 hours.
5. Hold payout until all required contributions arrive.
6. Let owner send reminder.
7. Allow member to pay late.
8. Escalate to admin if overdue beyond grace period.
9. Admin can freeze, cancel, or resolve according to policy.

Important risk:

The biggest Paluwagan risk is a member receiving an early payout and then refusing to contribute in later cycles.

Mitigations:

- Invite-only groups
- Low group and amount limits
- Verified phone and email
- No public discovery
- First contribution required before activation
- Optional one-cycle buffer before first payout
- Admin freeze controls
- Full audit trail
- Clear disclosure that members are responsible for joining only people they trust

## Notifications

MVP channels:

- In-app
- Email

Later channels:

- SMS
- Push notifications

Notification events:

- Member invited
- Member accepted invite
- Group ready to start
- Group activated
- Contribution due soon
- Contribution due today
- Contribution overdue
- All cycle contributions paid
- Payout processing
- Payout completed
- Payout failed
- Group completed
- Group frozen or cancelled

## Recommended UI/UX

The Paluwagan experience should feel like a modern wallet app, not a social feed.

Design principles:

- Mobile-first
- Clear money status first
- Plain language
- Large primary CTA
- Compact member rows
- Receipt-style activity history
- Status chips for paid, due, late, and received
- Avoid tables on mobile
- Avoid investment language
- Use calm fintech visuals

Key screens:

### Circles Home

Shows:

- Active groups
- Next contribution due
- Upcoming payout
- Completed groups
- `Create Paluwagan` CTA

### Create Paluwagan

Wizard steps:

1. Basics
2. Members
3. Payout order
4. Review

### Join Invite

Shows:

- Group name
- Owner
- Contribution amount
- Schedule
- User payout position
- Expected payout date
- Rules summary
- Accept CTA

### Group Detail

Shows:

- Current cycle card
- Pool progress
- Current payout recipient
- Paid/unpaid member list
- Payout timeline
- Activity history
- Reminder action

### Contribution Review

Shows:

- Amount due
- Wallet used
- Due date
- Balance before and after
- Network fee
- Confirm with PIN

### Receipt

Shows:

- Amount
- Group
- Cycle
- Timestamp
- Reference number
- Transaction hash, if available

### Admin Review

Shows:

- Group status
- Members
- Contributions
- Payouts
- Risk flags
- Freeze/cancel/resolve actions

## Mobile-First Responsive Considerations

- Use sticky bottom actions for `Pay contribution`, `Start group`, and `Send reminder`.
- Put the current cycle summary at the top.
- Use single-column layouts on mobile.
- Collapse payout timeline into horizontal scroll.
- Use member rows instead of tables.
- Keep buttons large enough for thumb use.
- Keep status labels short.
- Ensure payment warnings and review details are visible before confirmation.
- Preserve bottom padding so the existing mobile tab bar does not cover actions.

## Database Schema Recommendation

Suggested Prisma models:

```prisma
model PaluwaganGroup {
  id                 String   @id @default(cuid())
  name               String
  ownerId            String
  walletId           String
  contributionAmount String
  asset              String   @default("XLM")
  frequency          String
  customIntervalDays Int?
  startAt            DateTime?
  gracePeriodHours   Int      @default(48)
  status             String   @default("DRAFT")
  inviteCode         String   @unique
  currentCycle       Int      @default(0)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model PaluwaganMember {
  id             String    @id @default(cuid())
  groupId        String
  userId         String
  role           String    @default("MEMBER")
  status         String    @default("INVITED")
  payoutPosition Int
  payoutWalletId String?
  joinedAt       DateTime?
}

model PaluwaganCycle {
  id             String   @id @default(cuid())
  groupId        String
  cycleNumber    Int
  dueAt          DateTime
  payoutMemberId String
  status         String   @default("UPCOMING")
}

model PaluwaganContribution {
  id        String    @id @default(cuid())
  cycleId   String
  memberId  String
  amount    String
  status    String    @default("DUE")
  paidAt    DateTime?
  txHash    String?
}

model PaluwaganPayout {
  id       String    @id @default(cuid())
  cycleId  String
  memberId String
  amount   String
  status   String    @default("SCHEDULED")
  paidAt   DateTime?
  txHash   String?
}

model PaluwaganActivity {
  id          String   @id @default(cuid())
  groupId     String
  actorId     String?
  type        String
  description String
  createdAt   DateTime @default(now())
}
```

Recommended later refinements:

- Replace string statuses with Prisma enums.
- Add foreign-key relations after finalizing naming.
- Add indexes for `ownerId`, `userId`, `groupId`, `status`, and due dates.
- Add idempotency keys for contribution and payout operations.
- Add notification delivery tables.
- Add admin action audit table.

## Backend Structure

Recommended files:

```txt
server/services/paluwagan-service.ts
services/paluwagan-service.ts
pages/api/paluwagan/index.ts
pages/api/paluwagan/[id].ts
pages/api/paluwagan/[id]/join.ts
pages/api/paluwagan/[id]/start.ts
pages/api/paluwagan/[id]/contribute.ts
pages/api/paluwagan/[id]/remind.ts
pages/api/paluwagan/[id]/cancel.ts
pages/api/admin/paluwagan/[id]/freeze.ts
pages/api/jobs/paluwagan/reminders.ts
pages/api/jobs/paluwagan/process-cycles.ts
```

Recommended service responsibilities:

- Validate group rules.
- Create invite codes.
- Manage member acceptance.
- Generate cycles.
- Record contributions.
- Check whether a cycle is ready for payout.
- Trigger payout.
- Record activity.
- Send notifications.
- Enforce group, amount, and velocity limits.
- Expose admin review actions.

## Suggested API Endpoints

User endpoints:

```txt
GET    /api/paluwagan
POST   /api/paluwagan
GET    /api/paluwagan/:id
PATCH  /api/paluwagan/:id
POST   /api/paluwagan/:id/invite
POST   /api/paluwagan/:id/join
POST   /api/paluwagan/:id/start
POST   /api/paluwagan/:id/contribute
POST   /api/paluwagan/:id/remind
POST   /api/paluwagan/:id/report
POST   /api/paluwagan/:id/cancel
```

Admin endpoints:

```txt
GET    /api/admin/paluwagan
GET    /api/admin/paluwagan/:id
POST   /api/admin/paluwagan/:id/freeze
POST   /api/admin/paluwagan/:id/unfreeze
POST   /api/admin/paluwagan/:id/cancel
POST   /api/admin/paluwagan/:id/resolve
```

Job endpoints:

```txt
POST   /api/jobs/paluwagan/reminders
POST   /api/jobs/paluwagan/process-cycles
POST   /api/jobs/paluwagan/mark-overdue
```

## Security And Fraud Prevention

Minimum safeguards:

- PIN confirmation for joining, contributing, starting, and payout-sensitive actions
- Immutable rules after activation
- Review-before-confirm on contributions
- Full contribution and payout receipts
- Full group activity history
- Idempotent payment operations
- Strict invite limits
- Group size limits
- Contribution amount limits
- Daily and monthly transaction limits
- Admin freeze capability
- Device and session monitoring
- Rate limiting on group creation and invites
- No public discovery
- No profit/yield language
- KYC tiers before higher limits
- Data minimization
- Consent-based processing for personal information
- Encryption for secrets and sensitive values
- Clear member visibility rules

Privacy considerations:

- Members should only see payment status necessary for group trust.
- Do not expose full wallet addresses by default.
- Do not expose phone numbers unless users consent.
- Keep admin access audited.
- Provide privacy notice updates before launch.

## Architecture Recommendation

MVP architecture:

- Use existing Next.js pages API pattern.
- Use Prisma/Postgres for group state.
- Use existing auth/session system.
- Use existing wallet service for active wallet lookup.
- Use existing Stellar service for value movement.
- Use existing mailer for email reminders.
- Add in-app notifications if not already generalized.

Production money movement:

- Prefer USDC or a stable asset rather than XLM for real Paluwagan groups.
- Use a dedicated escrow or pooled group wallet model only after compliance review.
- Consider Stellar claimable balances or smart-contract-style escrow logic later.
- Start with small limits until operational risk is proven manageable.

## Why This Adds Value

Paluwagan extends Sagip from individual family safety nets into trusted group saving.

Potential value:

- Strong cultural fit for Filipino users
- More recurring wallet activity
- More referrals through invite links
- Better retention through scheduled contributions
- Clear differentiation from generic wallets
- Natural expansion from loved ones to trusted circles

It supports the same emotional promise as Sagip: money set aside with clear rules, visible progress, and trust.

## Risks And Limitations

Key risks:

- Regulatory risk if launched with real money without correct licensing or partnerships
- Fraud risk from members who receive early and stop paying
- Disputes among friends and family
- Customer support burden
- Privacy issues around member payment status
- Asset volatility if using XLM for real funds
- Reputational risk because online Paluwagan is associated with scams

Key limitations:

- The app cannot guarantee that members will continue paying after receiving a payout unless the payment design requires prefunding or collateral.
- Admin dispute tools can reduce harm but cannot eliminate social trust risk.
- Real-money launch needs compliance readiness beyond the current testnet/demo posture.

## Recommended MVP

Build Paluwagan as a dedicated advanced module that reuses Sagip wallets but stays separate from the existing safety-net flow.

Include:

- Invite-only groups
- 3 to 12 members
- Weekly and monthly schedules
- Fixed contribution amount
- Locked payout order
- Member acceptance before activation
- Contributions from Sagip wallets
- Payout only when all cycle contributions are confirmed
- Progress tracking
- Contribution history
- Payment reminders
- Overdue handling
- Admin freeze and dispute tools
- Low limits and no-profit language

This MVP can later expand into custom schedules, SMS, push notifications, stablecoin production settlement, stronger escrow, KYC tiers, repeated rounds, and richer admin dispute workflows without requiring a major architectural rewrite.
