# Sagip — Transaction Experience

This document describes the full money-movement experience in plain, business terms so
stakeholders can evaluate how the product behaves in real-world scenarios. It covers every
stage a user goes through, what they see, how long it takes, what can go wrong, and how the
product keeps them informed and safe.

A status marker is shown throughout: **[Live]** = working today on testnet · **[Planned]** =
designed, on the roadmap (see PRODUCTION.md).

---

## 1. The four money actions, in the user's words

Sagip has four money movements. None of them use technical language in the interface.

| Action | Who does it | Plain meaning |
|--------|-------------|---------------|
| **Set aside** | The sender | Put money aside for a loved one; it stays yours. |
| **Check in** | The sender | Tap “I’m okay” to keep the money in your hands and reset the timer. |
| **Take back** | The sender | Return the money to yourself at any time. |
| **Receive** | The loved one | Collect the money once it has opened to them. |

The two that move value between people are **Set aside** and **Receive** — the rest keep the
money with the sender.

---

## 2. Full transaction lifecycle (Set aside → Receive)

```
  SENDER                                        LOVED ONE
  ──────                                        ─────────
  1. Enter amount + recipient
  2. REVIEW screen (breakdown)  ──confirm──►
  3. Processing (a few seconds)
  4. Set aside — COMPLETED  ✔
     • receipt + reference id
     • balance updated
  5. Watching over  ────────────────────────►  (sees a locked "opens on…" screen)
       │  (sender checks in to stay in control)
       │
  6.  If a check-in is missed…
       └─────────────────────────────────────►  OPEN TO FAMILY
                                                 7. Taps "Receive"
                                                 8. Processing (a few seconds)
                                                 9. RECEIVED  ✔
                                                    • receipt + reference id
                                                    • funds delivered
```

**Estimated timing at each stage**

| Stage | What's happening (business view) | Typical time |
|-------|----------------------------------|--------------|
| Review → Confirm | User checks the breakdown | User-paced |
| Processing (set aside) | Money is being locked in the safety net | **3–6 seconds** [Live] |
| Watching over | Sender is checking in on their schedule | The chosen interval (e.g. monthly) |
| Opens to family | Automatic, the moment the check-in window lapses | Instant, no processing |
| Processing (receive) | Money is being delivered to the loved one | **3–6 seconds** [Live] |
| Cash-out to bank/GCash | Loved one moves pesos out | **Minutes–hours**, anchor-dependent [Planned] |

The core network confirmations are near-instant (a new ledger closes roughly every 5
seconds), so “sending” and “receiving” feel immediate — a strong contrast with traditional
remittance that can take hours or days.

---

## 3. Transaction statuses and what they mean

Every action has a clear status shown as a coloured chip.

| Status | Meaning to the user | When it appears |
|--------|---------------------|-----------------|
| **Pending** | We’ve received your request and are getting it ready. | Briefly, on confirm [Live, momentary] |
| **Processing** | The money is moving now. | The 3–6s window [Live, momentary] |
| **Completed** | Done and permanently recorded. | Set aside / check-in / take-back / receive succeeded [Live] |
| **Watching over** | Money is set aside and still yours; family can’t claim yet. | Between check-ins [Live] |
| **Open to family** | The window lapsed; your loved one can now receive it. | After a missed check-in [Live] |
| **Received** | Your loved one has the money. | After they claim [Live] |
| **Taken back** | You returned the money to yourself. | After a take-back [Live] |
| **Failed** | It didn’t go through; nothing was moved. Try again. | On a rejected transaction [Live] |
| **Cancelled** | You backed out before confirming. | User taps “Go back” at review [Live] |

Because network confirmation is fast, **Pending** and **Processing** are short-lived; most
users experience a request going straight to **Completed**. The statuses still exist so slow
networks and failures are communicated honestly.

---

## 4. Before confirming: the breakdown the user sees [Live]

When the sender taps to set money aside, they don’t commit immediately. They land on a
**Review** screen showing exactly what will happen:

```
  Please review
  ─────────────────────────────────────────────
  Amount to set aside        15,000   (≈ ₱91,500 today)
  For                        Nanay Elena
  Opens to family            if you don't check in every month
  Network fee                less than 0.00001 (free)
  ─────────────────────────────────────────────
  Your funds now             40,000
  After setting aside        25,000
  ─────────────────────────────────────────────
     [ Go back ]     [ Confirm & set aside ]

  You can take this money back at any time while it's still yours.
```

This gives the user: the amount, its **live currency value**, where it’s going, when it
opens, the **fee**, and their **balance before and after** — all before they commit. No
surprises.

---

## 5. Confirmation and success / failure screens [Live]

- **On success (sender):** a green “**Money set aside successfully**” banner with the amount,
  the recipient, and a pointer to the receipt in history.
- **On success (receiver):** a full-screen “**All received**” confirmation with a checkmark,
  the amount, who it’s from, and a **reference number**.
- **On failure:** a plain message — e.g. “The money couldn’t be moved right now. Please try
  again.” — with the action still available to retry. Nothing is deducted on a failure.

---

## 6. Notifications to sender and receiver

Keeping both sides informed is essential to trust. Channels: **in-app** now; **SMS and push**
are planned because the whole “safety net” idea depends on timely reminders.

| Event | Sender gets | Receiver gets | Status |
|-------|-------------|---------------|--------|
| Money set aside | “You set aside 15,000 for Nanay Elena.” | “Juan set aside money for you. You’ll be able to receive it if he can’t check in.” | In-app [Live] · SMS/push [Planned] |
| Check-in reminder | “Time to check in so your money stays yours.” | — | [Planned] |
| Check-in done | “You checked in. The money stays yours.” | — | In-app [Live] |
| Opened to family | “Your safety net has opened to Nanay Elena.” | “Money from Juan is now ready for you to receive.” | [Planned] |
| Received | “Nanay Elena received 15,000.” | “You’ve received 15,000 from Juan.” | In-app [Live] · SMS/push [Planned] |
| Taken back | “You took back 15,000.” | “This money is no longer available.” | In-app [Live] |

---

## 7. History, receipts, and reference IDs [Live]

- Every safety net has a **History** section that reads like a list of receipts.
- Each entry shows: **what happened**, its **status**, a **reference number**, the **date and
  time**, and a **“View verified record”** link to the permanent public record.
- **Reference number format:** `SGP-XXXXX-XXXXX` (e.g. `SGP-9F3A2-1C7B0`) — short enough to
  read over the phone, unique to each transaction, and shown to both sender and receiver.
- The receiver sees their reference on the success screen so they have proof of receipt.

---

## 8. Fees and exchange rates [Live]

- **Fees are effectively zero.** Each transaction pays a fixed network fee of 0.00001 of the
  currency unit — a tiny fraction of a centavo. There are no percentage-based transfer fees.
  This is a headline advantage over traditional remittance (which commonly charges 3–7%).
- **Exchange rates are live**, refreshed every minute, and shown wherever money is displayed:
  balances, the review screen, and a dedicated **currency converter**.
- Supported display/convert currencies: **PHP, USD, USDC, EUR, SAR, AED, SGD, HKD** (chosen
  around major overseas-worker destinations).
- The exact rate used is shown at the moment of review, so the user always sees today’s value
  before confirming.

> Roadmap note (PRODUCTION.md): for real money the held asset should be **USDC** (stable
> value) rather than a variable one, so a safety net’s peso value doesn’t drift. Fees and
> rates behave the same.

---

## 9. Expected delivery times — what to expect after sending [Live]

- **Immediately after setting aside:** the money is locked in the safety net; the sender’s
  balance updates within seconds; a receipt appears in history.
- **For the loved one:** the money is not “in transit.” It sits safely and **opens to them on
  the schedule the sender set** — the sender is in control until then. This is by design: it
  is a safety net, not an instant transfer.
- **When it opens:** receiving is **instant** — one tap and the funds are theirs within
  seconds.
- **Cash-out to pesos [Planned]:** once anchor integration is live, moving funds to a bank or
  GCash completes in minutes to a few hours depending on the rail.

---

## 10. Error scenarios and how they’re handled [Live]

Every error is explained in plain language with a clear next step; **money is never moved on
a failed action.**

| Scenario | What the user sees | What happens |
|----------|--------------------|--------------|
| **Not enough funds** | “You don’t have enough funds for this. Please add funds first.” | Blocked at review; an **Add funds** path is offered. |
| **No recipient chosen** | “Please choose who this is for.” | Blocked before review. |
| **Amount too small/large** | “Please enter an amount of at least …” / limit message | Blocked before review. |
| **Network delay** | The button shows a spinner; status stays **Processing**. | The app waits for confirmation, then updates. |
| **Transaction failed** | “The money couldn’t be moved right now. Please try again.” | Nothing deducted; user can retry. |
| **Family claims too early** | The receive button is disabled with an “opens on …” note. | The rules prevent early receipt. |
| **Already received / taken back** | “This money has already been received / is no longer available.” | The link shows the final state. |
| **Session expired** | “Please sign in again.” | User re-authenticates; no data lost. |

---

## 11. Security and trust indicators [Live unless noted]

- **Review-before-confirm** on every set-aside, with the full breakdown.
- **Two-tap intent** for irreversible actions (e.g. take-back asks for confirmation).
- **Verified public record:** each transaction links to an independent, tamper-proof record
  the user can open — real proof the money moved, not just an in-app claim.
- **Reference numbers** on both sender and receiver sides.
- **Audit history:** an admin can see every transaction across the platform with its verified
  record, but only public keys. A recovery key is shown only to its owner in the PIN-guarded
  wallet setup/reveal flow and is otherwise stored encrypted.
- **Rules enforced by the network, not by us:** a loved one cannot receive early, and only the
  sender or the chosen loved one can ever touch the money.
- **Planned:** OTP/2-factor for withdrawals, sign-in rate-limiting and lockout, PIN recovery.

---

## 12. Limits and supported currencies

Sensible limits protect users and support compliance. Testnet uses generous values for
testing; the mainnet column reflects a typical pilot tier.

| Limit | Testnet (now) | Mainnet pilot [Planned] |
|-------|---------------|--------------------------|
| Minimum per safety net | 1 | ₱100 |
| Maximum per safety net | (test funds) | ₱50,000 |
| Daily set-aside total | — | ₱100,000 |
| Monthly set-aside total | — | ₱500,000 |
| Add-funds (test) | 500 per top-up | n/a (real deposit via anchor) |
| Held currency | XLM | **USDC** (stable) |
| Display / convert | PHP, USD, USDC, EUR, SAR, AED, SGD, HKD | same |

Limits above the pilot tier unlock with full identity verification (KYC), consistent with
Philippine e-money/remittance practice.

---

## 13. Wallet balance behaviour [Live]

- The balance is shown prominently with its **live peso value**.
- **Before a transaction:** the review screen shows the current balance and the balance that
  will remain after.
- **After a transaction:** the balance updates within seconds of completion — down after
  setting aside, back up after a take-back, and up for the loved one after they receive.
- Balances always reflect the **real, on-record amount**, not an estimate.

---

## 14. Implementation status at a glance

**Working today (testnet):** the full set-aside → watch → open → receive lifecycle; review
screen with fee/rate/balance breakdown; success and failure screens; in-app notifications;
history with receipts and reference numbers; verified-record links; live rates and converter;
balance updates; insufficient-funds and other error handling; admin audit view.

**On the roadmap (see PRODUCTION.md):** SMS/push notifications; real peso deposit and
cash-out via a licensed anchor; USDC as the held asset; enforced daily/monthly limits with
KYC tiers; OTP/2-factor and PIN recovery.

This gives stakeholders a complete, realistic picture: the experience is fully designed and
the core money flow is already real and verifiable on-chain, with a clear, funded path to a
production launch.
