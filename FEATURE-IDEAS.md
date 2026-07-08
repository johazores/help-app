# Sagip — Simple Feature Ideas from the Workshop List

These are additions screened from the 300-ideas document against three filters: they fit
Sagip's story (money set aside for family), they reuse what's already built (claimable
balances, custodial wallets, claim links, check-ins), and they're **genuinely simple** —
no Soroban, no new external integrations. Ordered by effort.

Each entry: what it is in Sagip's words → the doc idea it draws from → why it's easy here.

---

## Tier 1 — Very small (hours each)

**1. "Send now" — a simple gift link** *(from #1/#19's primitive, inverted)*
Not everything needs a check-in. Add a "Send money now" option that creates the same
claimable balance but **already open** — the loved one taps the link and receives
immediately. It's remittance-lite using the exact code path that already exists (just an
unconditional predicate for the recipient). One new option on the create screen, zero new
infrastructure — and it makes Sagip useful *every month*, not only in emergencies.

**2. Scheduled gift — "opens on a date"** *(from #54, Time-Bounded Transactions)*
A birthday/Christmas/graduation gift that opens to the loved one **on a chosen date** —
no check-ins involved. Same predicate machinery as the safety net, but the date is a
celebration instead of a worry. UI: pick a person, an amount, and a date; the claim page's
"not open yet" state already handles the waiting beautifully.

**3. Check-in streaks & gentle reminders** *(supports the core, no new primitive)*
Show "You've checked in 6 times in a row" on the safety-net screen, and a soft banner on
the dashboard when a check-in window is more than half elapsed. Pure UI over data we
already store (`lastCheckInAt`, `checkInIntervalMinutes`). Makes the core habit sticky.

---

## Tier 2 — Small (a day or two each)

**4. Split safety net — one pot, several loved ones** *(from #3, Multi-Recipient Split)*
"Set aside 30,000: if I can't check in, 15,000 opens to Nanay, 10,000 to my sister, 5,000
to my brother." One transaction with multiple claimable-balance operations — Stellar
charges per operation, so this is native and cheap. The create flow gains a percentage/
amount splitter; each recipient gets their own claim link. Very strong demo moment.

**5. Emergency button for the family** *(from #6, Emergency Fund Trigger — simplified)*
A special net where the loved one can ask for it early: their claim page shows a
**"Request this now"** button; the sender gets a prominent approve/decline on their
dashboard, and approving simply reclaims-and-recreates the balance as already-open (the
same operation a check-in uses). No pre-signed transactions needed in a custodial model —
it's a status field plus one existing Stellar call. Turns Sagip into a two-way lifeline.

**6. Goal pot — save toward something, together** *(from #7/#49, savings pots — minus yield/certificates)*
A named pot ("Roof repair", "Tuition June") with a target amount. The sender tops it up
over time (repeated small top-ups into the wallet, tracked per pot in the DB), a progress
ring shows how close it is, and at the target they convert it into a safety net or a
"send now" gift in one tap. Reuses the lifeline-ring component and the top-up flow.

**7. Paluwagan-style rotating gift** *(adjacent to #18, kept manual and simple)*
A very light group feature: 3–5 family members each set aside a fixed amount monthly, and
each month one member's claim link opens (rotation stored in the DB, each round is just a
scheduled gift from Tier 1 #2). No pooling contract, no trust logic — just coordinated
scheduled gifts with a shared progress page.

---

## Tier 3 — Worth it, still no Soroban (a few days)

**8. Tuition net — opens term by term** *(from #23, without the school as a party)*
One pot that opens to the loved one **in tranches on set dates** ("10,000 on June 1,
10,000 on Nov 1"). Implementation: N scheduled gifts created in one flow, shown as one
plan with a timeline. All native time predicates; the per-term "release" is just each
tranche's date arriving.

**9. Funeral/abuloy fund — the solemn preset** *(from #49, minus death certificates)*
Not new machinery — a **preset** of the existing safety net with appropriate framing,
copy, and a suggested amount, plus multiple recipients (Tier 2 #4). Sensitive, deeply
Filipino, and honest: the check-in mechanism *is* the death-certificate substitute.

**10. Printable claim card (QR)** *(from #17, SEP-7 print QR — simplified to our link)*
A printable/downloadable card for the loved one: "Money is set aside for you" with the
claim link as a **QR code**, the sender's name, and simple instructions. For family
members who lose links in chat threads — print it, put it in the family Bible or drawer.
We already ship a QR library; this is one page and one button. (This is the QR use case
that finally earns its place: recovery of access, not decoration.)

---

## Deliberately NOT recommended (fails the "simple" filter)

- **Purpose-locked spending / receipt-verified release (#4)** — needs Soroban + receipt
  oracles; the trust model gets ugly fast.
- **Yield on savings pots (#7's second half)** — pulls in DeFi protocols, risk, and
  regulatory weight.
- **Insurance premium collection (#21)** — requires an insurer counterparty.
- **Anything requiring anchors/PSPs** — already tracked in PRODUCTION.md as the cash-out
  milestone; not a "simple idea."
- **Rate aggregator (#2), payment router (#13)** — different product entirely.

## Suggested order

If picking three for the next iteration: **#1 (Send now)** → **#4 (Split net)** →
**#2 (Scheduled gift)**. Together they turn Sagip from "the app for the worst day" into
"the app the family uses every month, which also protects the worst day" — a much
stronger approval-and-funding story, at almost no architectural cost.
