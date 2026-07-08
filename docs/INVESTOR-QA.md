# Investor & Judge Q&A

**Q: What problem does this solve, in one sentence?**
A: Two million OFW families depend on one remitter — Sagip makes sure the money still
arrives on the day that person can't send it, and makes everyday sending safer meanwhile.

**Q: Why blockchain? Couldn't a bank do this?**
A: The core promise — "this money opens to my family automatically if I go silent, and
until then nobody, not even the platform, can redirect it" — is enforced by Stellar
claimable balances at the protocol level, not by our goodwill. A bank equivalent is a
trust/escrow product with paperwork and fees; ours is a 5-second setup with a shareable
link. Fees are ~0.00001 XLM per operation and settlement is ~5 seconds.

**Q: How do you make money?**
A: Planned: a small fee on cash-out (like remittance apps, but lower), premium family
tools (multi-recipient plans, larger paluwagan groups), and float-free — we never hold
pooled funds. We will not do yield/lending products.

**Q: What's the moat?**
A: The dead-man's-switch safety net is a genuinely different primitive from every wallet
and remittance app in the market, it's culturally specific (abuloy, paluwagan, padala),
and every safety net creates a years-long recurring relationship (check-ins) plus a
built-in viral loop (every net invites a family member via its link).

**Q: Receiving works, but where's the cash-out?**
A: Deliberately sequenced. Receiving is live end-to-end on-chain today; cash-out to
GCash/Maya/banks requires a licensed anchor/PSP partner (BSP-regulated), which is a
partnership + compliance milestone, not an engineering one. The app never pretends
otherwise — receivers see an honest "coming soon." See PRODUCTION.md for the exact plan.

**Q: What stops a paluwagan member from taking a payout and vanishing?**
A: Nothing can, fully — and we say so in-product. We contain it: invite-only, locked
rules, visible payout order before joining, direct member-to-member payments (we hold
nothing), low caps, and planned admin freeze. We sell coordination and receipts, not a
guarantee — that honesty is itself a differentiator in a category full of scams.

**Q: What if Sagip disappears? (custody question)**
A: Users can export a wallet's recovery key (PIN-guarded) at any time — the funds live on
Stellar, not on our servers. Money in an open safety net is claimable by the family
directly on-chain. We're custodial for convenience, not lock-in.

**Q: Regulatory risk?**
A: Mapped, not ignored: testnet demo today; production needs BSP alignment (OPS/EMI/VASP
depending on final shape), KYC/AML, and Data Privacy Act compliance — detailed in
PRODUCTION.md with the anchor-first sequencing that minimizes what we ourselves must license.

**Q: Traction plan for the first 1,000 users?**
A: OFW communities are dense and online (Facebook groups, agencies, seafarer networks).
Every safety net recruits its own receiver. Paluwagan groups recruit 2–12 at a time.

**Q: Why this team?** *(fill in personally — judges always ask)*
Suggested frame: proximity to the problem + shipped full product solo + Stellar-native design.
