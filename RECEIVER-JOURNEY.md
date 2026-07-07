# Sagip — The Receiver's Journey

The receiver is often the least technical person in the whole product: a parent, a child, a
sibling at home in the Philippines, opening a link on their phone. This document is the
complete screen-by-screen experience — copy, buttons, states — plus the planned withdrawal
flow.

**Product truth this journey is built on:** Receiving is live — tapping **Receive** makes
the money theirs inside Sagip, kept safe under their name. Withdrawing to pesos (GCash,
Maya, bank) is **planned** and requires a licensed anchor/PSP integration. Nothing in the
app implies cash-out exists before it does.

Tone rules: reassuring, simple, human. No blockchain words — never "wallet address,"
"claim," "claimable balance," "transaction," "on-chain," or "custodial."

---

## The journey at a glance

```
 Opens link ──► LOADING ──► one of:
                            A. NOT OPEN YET   (sender is checking in — nothing to do)
                            B. READY          (tap Receive)
                            C. ALREADY YOURS  (received earlier — receipt + withdraw preview)
                            D. NO LONGER AVAILABLE (sender took it back)
                            E. LINK ERROR

 B ──tap Receive──► RECEIVING… ──► SUCCESS ──► WITHDRAW (coming soon)
```

---

## Screen 1 — Loading

Shown for the moment the link is being opened.

> *(spinner)*
> **Opening your link…**

No buttons. If it fails → Screen E.

---

## Screen A — Not open yet  `[Live]`

The sender is still checking in. The receiver needs reassurance and zero tasks.

> *Elena set this aside for you*
> **Monthly support**
> **15,000**
>
> **You don't need to do anything right now.**
> Elena is keeping this money safe by checking in regularly. If they ever can't — starting
> **March 3, 2026** — it opens to you, and this page will let you receive it.
>
> *Keep this link safe. You can open it anytime to check.*

Buttons: none. The page quietly re-checks on its own and switches to **Ready** the moment
it opens — no refresh needed.

---

## Screen B — Ready to receive  `[Live]`

The heart of the journey. The button explains itself, and what "Receive" means is stated
**before** the tap — the money becomes theirs *inside Sagip*.

> *From Elena, for you*
> **Monthly support**
> **15,000**
> This money is ready for you.
>
> **[ Receive 15,000 ]**
> Tapping Receive makes this money yours, kept safe here in Sagip under your name.
>
> **Good to know**
> Moving this money to GCash, Maya, or a bank account isn't available just yet — we're
> working with licensed payment partners to add it. Until then, your money stays safe here,
> and you can come back to this page anytime.

Button label: **Receive 15,000** (always shows the amount — concrete beats abstract).
While processing, the button shows a spinner (a few seconds).

**Error state (on the same screen):**
> That didn't go through. You can simply try again — nothing is lost.

Money never moves on a failed attempt; the button stays available.

---

## Screen C — Success / Already yours  `[Live]`

Shown right after receiving, and again on any future visit to the link.

> *(gold checkmark)*
> **This money is now yours**
> 15,000 from Elena is safely yours, kept here in Sagip under your name.
>
> Your receipt number: **SGP-9F3A2-1C7B0**
> *Save this link — it's your proof, and it's where withdrawing will happen.*

Below it, the honest withdraw preview:

> **Move it to your pocket** `COMING SOON`
> Soon you'll be able to move this money straight to:
>
> ▢ **GCash** — Not yet available
> ▢ **Maya** — Not yet available
> ▢ **Bank account** — Not yet available
>
> We're partnering with licensed payment providers in the Philippines to make this
> possible. Your money is safe here in the meantime — nothing expires, and no one else
> can touch it.

The three options are visibly disabled (dimmed, "Not yet available"). They set the mental
model for the future flow without pretending it works today.

---

## Screen D — No longer available  `[Live]`

The sender took the money back (their right, while it's still theirs).

> **This is no longer available**
> Elena has taken this money back — that's something they can do while it's still theirs.
> There's nothing you need to do.

No blame, no alarm, no dead-end confusion.

---

## Screen E — Link error  `[Live]`

> **Hmm, this link isn't working**
> Please check that you opened the full link, exactly as it was sent to you. If it still
> doesn't work, ask the person who sent it to share it again.

---

## The planned Withdraw flow  `[Planned — requires licensed anchor/PSP]`

When a partner integration is live, the "Coming soon" section on Screen C becomes active.
Four steps, one decision each:

**W1 — Choose where it goes**
> **Where should we send your money?**
> ▸ GCash ▸ Maya ▸ Bank account
> Buttons: tap an option to continue.

**W2 — Enter the details**
> GCash/Maya: **What's the GCash number?** (*09XX XXX XXXX*) — "Double-check the number;
> money sent to the wrong account can't be recovered."
> Bank: bank picker + account number + account name.
> Button: **Continue**

**W3 — Review before sending** *(the no-surprises screen)*
> **Please review**
> Sending: **₱15,000**
> To: GCash · 0917 ••• 4567
> Fee: ₱XX
> You'll receive: **₱XX,XXX**
> Usually arrives: within minutes
> Buttons: **[ Confirm & withdraw ]** / *Go back*

**W4 — Done**
> *(checkmark)* **On its way**
> ₱XX,XXX is on its way to your GCash. It usually arrives within minutes.
> Receipt number: SGP-XXXXX-XXXXX
> *We'll keep this receipt here for you.*

Error states: invalid number (inline, before review), partner delay ("It's taking a little
longer than usual — your money is safe and on its way"), failure ("This didn't go through
and your money was NOT taken. Please try again.").

---

## Copy principles used throughout

- **Say what the button does before they tap it.** "Tapping Receive makes this money
  yours, kept safe here in Sagip under your name."
- **One idea per screen.** Waiting screens ask for nothing; the action screen has one button.
- **Never imply cash-out exists.** "Coming soon" is visually and verbally unambiguous.
- **Reassure about safety, honestly.** "Nothing expires, and no one else can touch it" —
  both true of how the product works.
- **Failure never costs money, and the copy says so.** "Nothing is lost." / "Your money was
  NOT taken."
- **Everything is a receipt.** Reference numbers on success, and the link doubles as
  permanent proof.
