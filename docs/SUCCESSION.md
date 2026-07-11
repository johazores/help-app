# Backup beneficiary & succession

Sagip solves two related fears:

1. **Sender stops checking in** → money opens to the named loved one.
2. **Loved one receives the money but later can't keep it** (including if they pass away) → money passes to a **backup person** the sender chose upfront.

This is the answer to: *"What if the receiver already got the money, then died?"*

---

## If the receiver passes away after receiving

This is the scenario the backup beneficiary is for — not a lost phone, but **death (or any reason they can no longer act)** after the money was successfully transferred.

### With a backup person configured ✅

1. Primary taps **Receive** → money enters a **post-receipt guard** on Stellar (status: **Received — guarded**).
2. While alive, primary taps **"I'm okay"** on their link to keep the money theirs.
3. If they **pass away** (or become unable to check in), they naturally stop checking in.
4. After the check-in window lapses, the **backup person** opens the same link and taps **Receive**.
5. Money moves to the backup — enforced by Stellar, not by Sagip staff or death certificates.

**We do not verify death on-chain.** Succession works the same way as the original safety net: **no check-in → next person in line can receive.** That is intentional — it works for death, coma, lost capacity, or a lost phone without needing courts or paperwork.

### Without a backup person ⚠️

If you did **not** set a backup when sending:

- Primary receives → status **Received** → money sits in their Sagip account permanently from the app's perspective.
- If they pass away, there is **no automatic next step** in Sagip v1.
- Funds are not lost on-chain, but **no family member can claim them through the app** without legal estate processes (future: custodial recovery with documentation).

**Recommendation:** always add a backup when the amount matters — a sibling, spouse, or adult child who should receive if the primary cannot continue.

---

## How it works (plain language)

When you set aside money, you can optionally name a **backup person** — someone different from the primary receiver.

### Stage 1 — Sender → primary receiver (unchanged)

- You check in while the money is yours.
- If you can't, it opens to your loved one on the date you set.
- They tap **Receive** on their link.

### Stage 2 — Primary receiver → backup (new)

If you added a backup:

- When your loved one receives, the money goes into a **second safety net** on Stellar — same idea as yours, one layer deeper.
- Your loved one must tap **"I'm okay"** on the same link every so often (weekly, monthly, etc.).
- If they **stop checking in**, the money automatically opens to the **backup person**.
- The backup uses the **same link** to receive when it's their turn.

If you **didn't** add a backup, receiving works exactly as before — money goes straight to the primary receiver with no further check-ins.

---

## How it works on Stellar

Each stage uses **claimable balances with time predicates** — no smart contracts.

| Stage | Claimants | Meaning |
|-------|-----------|---------|
| Original safety net | Owner (unconditional) + primary (time-locked) | Sender check-in model |
| Post-receipt guard | Primary (unconditional) + backup (time-locked) | Receiver check-in model |

When the primary receiver taps **Receive** (with a backup configured), one atomic transaction:

1. `claimClaimableBalance` — claim from the original safety net
2. `createClaimableBalance` — recreate on the primary's account with the guard claimants

**Primary check-in** reclaims and recreates the guard balance with a later unlock date — identical to sender check-in.

**Backup receive** claims the guard balance after the unlock time passes.

The protocol enforces timing. Sagip's server cannot release funds early.

---

## Setting it up

1. Add at least **two loved ones** under **Loved ones** (primary + backup must be different people).
2. When you **Set aside money**, turn on **Add a backup person**.
3. Choose the backup and how often the primary should check in **after receiving**.
4. Share the claim link with the primary receiver as usual. Tell the backup person about the link too — they'll need it if the check-in window lapses.

---

## Statuses you'll see

| Status | Meaning |
|--------|---------|
| **Watching over** | Sender is checking in; primary can't receive yet |
| **Open to family** | Primary can receive |
| **Received — guarded** | Primary received; post-receipt check-ins active |
| **Received by backup** | Backup received after primary stopped checking in |
| **Received** | Primary received with no backup configured |

---

## Demo tip

Use **Every minute** for both the sender check-in interval and the receiver check-in interval. You can demo the full chain — sender lapse → primary receive → primary lapse → backup receive — in a few minutes.

---

## What this does *not* do (honest limits)

- **Death verification** — we don't ask for death certificates. Succession is triggered by **check-in lapse**, the same trust model as the original safety net. If the primary is alive but stops tapping, the backup can receive.
- **Legal estate planning** — Sagip is a practical family safety net, not a will replacement.
- **Multiple backups** — one backup per safety net in v1.
- **Partial amounts** — the full amount passes to backup; staged release is a possible future feature.

---

## Lost phone after receiving

The money **stays safe** — it's on Stellar under the receiver's name. Losing the phone does **not** lose the funds. What they lose is easy access to the **claim link**.

### Three ways to get back in

1. **Sender re-shares the link** — from the safety net in their Sagip app (**Copy link** works even after the money was received).
2. **Find your link** — at `/claim/recover`, enter the mobile number saved when they were added as a loved one.
3. **Printed card** — the QR/link card they were given when the money was set aside.

### If they had a backup configured

While **GUARDED**, the primary must check in on the link. If they lose their phone and **can't** check in in time, the backup can receive — same as if they passed away. That's why:

- Save the link in **more than one place** (print a card, tell the sender, save on another device).
- Add their **mobile number** when you add them as a loved one, so **Find your link** works.
- If it's urgent, the **sender can text the link again** immediately from the app.

The funds were never on the lost phone itself — only the link was.

---

## API endpoints

| Method | Path | Who | Action |
|--------|------|-----|--------|
| `POST` | `/api/safety-nets` | Sender | Create with optional `backupRecipientId` |
| `POST` | `/api/claim/:code` | Primary | Receive (creates guard if backup set) |
| `POST` | `/api/claim/:code/check-in` | Primary | Post-receipt check-in |
| `POST` | `/api/claim/:code/backup` | Backup | Receive after guard opens |
| `POST` | `/api/claim/recover` | Public | Look up links by loved one's mobile number |
