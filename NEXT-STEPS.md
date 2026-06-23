# Datum Tavern — Next Steps

_"The Rusty Flagon" — a tech demo for immersive, non-intrusive sponsored content
inside a blockchain game, powered by the [Datum Protocol](https://github.com/Baronvonbonbon/datum)._

This document is the working plan. Phase 0 is **done**; Phases 1–4 are queued.

---

## The demo thesis

Four tavern zones, each demonstrating a *different* way to integrate sponsored
content without breaking immersion:

| Zone | Integration pattern |
|---|---|
| 📜 **Quest Board** | Native ads inline with organic user notices (on-chain + mock) |
| 🍺 **Barkeep** | Sponsored NPC dialogue ("a traveller left coin to spread word…") |
| 📯 **Town Crier** | Dedicated billboard placement with a clear "sponsored" frame |
| 🎲 **Game Table** | Gameplay + optional wagering; sponsored actions earn the player |

## The economic model (how it actually works on-chain)

Datum settlement credits **both** the publisher and the *user* per impression:

```
DatumPaymentVault.creditSettlement(publisher, pubAmount, user, userAmount, protocolFee)
  userAmount = remainderAfterPublisher * _userShareBps / 10_000
```

So in this demo:

- The **connected MetaMask wallet is the Datum `user`** — the patron. Viewing
  ads (idle) and interacting with them accrues a real native-PAS revenue share
  to their `userBalance`, withdrawable via `DatumPaymentVault.withdrawUser()`.
  **This is the "earn while idle" mechanic.**
- The **tavern publisher** (a seeded address, see Phase 1) earns the publisher
  CPM share.
- The **advertiser's budget** funds it all, debited per event by action type:
  `budgetLedger.deduct(campaignId, actionType, amount)` where
  `actionType` = `0 view · 1 click · 2 action`. Idle views earn a little;
  clicking a creative or completing a sponsored game action earns more.
- **Game bets are separate** — they use the player's own PAS balance through
  `TavernBetting`, untouched by the ad economy.

### Settlement path: use the existing relay signers

The publisher and advertiser **already have running relay signers** on the live
system, so the production-faithful path is available without standing up keys:

- **Primary (production-faithful):** the user signs their claim batch in MetaMask
  (EIP-712 over the `DatumSettlement` domain), the running publisher + advertiser
  relay signers co-sign, and the batch is submitted to
  `DatumRelay.settleClaimsFor(SignedClaimBatch[])`. Anyone may submit (the relay
  has a liveness fallback), so submission can even be permissionless.
- **Fallback (no-infra):** `DatumSettlementLogicA.settleClaims` permits
  `msg.sender == batch.user`, so the player can self-settle their own claim
  straight from MetaMask if the relay is unavailable. Honest but unusual
  (the user spends the advertiser's budget) — keep it behind a dev toggle.

---

## Phase 0 — Foundation fixes ✅ DONE

Rewired the demo to the **real** alpha-core contract surface (the scaffold was
written against a fictional `getActiveCampaigns()`/`getCreative()` ABI).

- `src/lib/datumContracts.ts` — rewritten: enumerate `nextCampaignId()`, filter
  by `getCampaignPublisher` + Active status, read
  `DatumCampaignCreative.campaignMetadata(id) → bytes32`, resolve to the IPFS
  creative JSON `{ title, description, creativeText, cta, ctaUrl, imageUrl }`.
- `src/lib/ipfs.ts` — new; `bytes32 ⇄ CIDv0` + gateway URL (ported from
  `datum/web/src/shared/ipfs.ts`).
- `src/lib/addresses.ts` — real Datum addresses from
  `alpha-core/deployed-addresses.json` (Paseo / `polkadotTestnet`), correct
  chain id `420420417`, RPC, IPFS gateway, `ACTION_TYPE` enum.
- `src/lib/pine.ts` — fixed the read provider (was passing an EIP-1193 object
  where a URL string was expected); reads via Pine light client, **writes via
  MetaMask** (`window.ethereum`).
- `src/vite-env.d.ts` — new; types `window.ethereum`.
- Updated `MerchantStall`/`QuestBoard` for the resolved creative shape.
- Fixed pre-existing `tavernBetting.ts` type errors so `tsc` is clean.

**Status:** `npx tsc --noEmit` passes. Ad zones render empty gracefully until
addresses are seeded (Phase 1).

---

## Phase 1 — Seed the demo on-chain (fund from Alice)

Create real, fantasy-flavored data the demo reads. Fund everything from the
Datum **Alice** deployer account.

1. **Register the tavern publisher** in `DatumPublishers` (set `relaySigner`,
   profile). Write its address into `ADDRESSES.tavernPublisher`.
2. **Create 3–4 themed campaigns** targeting that publisher. Suggested flavor:
   - _Ironforge Smithy_ — "Blades that bite back. 10% off enchantments this moon."
   - _Eastvale Caravan Co._ — "Safe passage to the capital. Guards included."
   - _Madame Hex's Apothecary_ — "Potions, philtres, and the occasional curse."
   - _The Adventurers' Guild_ — "Now recruiting. Bring your own sword."
3. Upload each creative JSON (+ pixel-art image) to IPFS, `setMetadata(id, hash)`,
   fund budgets, allowlist advertisers, activate.
4. Script it: `scripts/seed-tavern.ts` (mirror the alpha-core setup scripts; read
   the Alice key from `.env`).

**You provide:** the funded Alice key in `.env`.

---

## Phase 2 — The earn loop (the payoff)

5. `src/lib/datumClaims.ts` — build a view/click/action `Claim`, get the user's
   EIP-712 signature via MetaMask, hand to the relay path, parse `ClaimSettled`.
6. Wire the mechanic:
   - **Idle views** accrue while ad zones are open (rate-limited, batched).
   - **Clicking a Town Crier creative / a Barkeep "tell me more"** → click claim.
   - **A sponsored game action** (e.g. "Smithy-sponsored dice round") → action claim.
7. Live **"your earnings"** readout from `DatumPaymentVault.userBalance` + a
   `withdrawUser()` button.
8. Deploy `TavernBoard` + `TavernBetting` to Paseo; fill their addresses; fund
   the betting house from Alice.

---

## Phase 3 — Contract Console (the "all functions" requirement)

9. A separate `/console` page with grouped panels exposing **every** function of
   `TavernBoard`, `TavernBetting`, and the Datum read/settle surface — inputs,
   call/sign buttons, inline results. Keeps the tavern itself immersive while
   making the full contract surface reachable.

---

## Phase 4 — Polish

10. Loading/empty/error states, IPFS image fallbacks, and a per-zone "what just
    happened on-chain" explainer — the actual tech-demo takeaway.

---

## Address sync reminder

Two sources of truth, both to update on a Datum redeploy:
- `src/lib/addresses.ts` — Datum protocol addresses (mirror
  `datum/alpha-core/deployed-addresses.json`, network `polkadotTestnet`).
- Tavern-owned addresses (`tavernBoard`, `tavernBetting`, `tavernPublisher`) —
  set after `npm run deploy` + `scripts/seed-tavern.ts`.
