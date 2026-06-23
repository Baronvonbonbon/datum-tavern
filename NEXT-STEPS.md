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

## Phase 1 — Seed the demo on-chain (fund from Alice) ✅ SCRIPT BUILT

`scripts/seed-tavern.mjs` (run with `npm run seed`) does the whole flow,
modeled on the proven `alpha-core/scripts/reseed-demo.mjs` Paseo patterns
(raw provider + nonce-poll for the receipt bug):

1. **Funds** the new tavern publisher + advertiser (Bob) from **Alice**.
2. **Registers a new tavern publisher** (`registerPublisher(takeBps)`) and
   **delegates its `relaySigner` → Diana** — the live relay holds Diana's key, so
   the already-running relay can settle for the new publisher (reconciles "new
   publisher" with "use existing relay signers").
3. **Creates N fantasy-merchant campaigns** (advertiser = Bob, who is already
   staked — `createCampaign` enforces advertiser stake), each funding **view +
   click + action pots** (`actionType` 0/1/2), so budget is tied to all three
   earning events. Merchants: Ironforge Smithy, Eastvale Caravan Co., Madame
   Hex's Apothecary, The Adventurers' Guild, Gilded Tankard Brewery, Whispering
   Wand Emporium.
4. **Uploads** a themed SVG + creative JSON to the local IPFS (Kubo) node and
   commits it via `DatumCampaignCreative.setMetadata` (CIDv0→bytes32; the
   encoding is the exact inverse of `src/lib/ipfs.ts`, verified).
5. **Activates** each campaign via `DatumGovernanceRouter.adminActivateCampaign`
   (Phase 0 admin gov; Alice = owner). Writes `tavern-seed.json` and prints the
   publisher address to paste into `ADDRESSES.tavernPublisher`.

### To run it (you provide)
- `.env` with `ALICE_KEY` + `ADVERTISER_KEY` (the Datum Alice/Bob test keys),
  funded on Paseo. Leave `TAVERN_PUBLISHER_KEY` blank on first run — the script
  generates one and prints it to save for idempotent re-runs.
- The **local Datum IPFS (Kubo) node running** (the script shells out to `ipfs add`).
- After it finishes: paste the printed `tavernPublisher` into
  `src/lib/addresses.ts` → the ad zones light up.

### Known caveats (deferred)
- `registerPublisher` does **not** stake the publisher. If Phase 2 settlement
  rejects the tavern publisher as under-staked, add a `DatumPublisherStake` step.
- The action pot (`actionType 2`) is funded, but claiming it in Phase 2 needs an
  action proof (`actionSig`); start the earn loop with view (+click) claims.
- **Denomination bug to fix in Phase 2:** `TavernBetting.sol`/`deploy.ts`/
  `tavernBetting.ts` assume `10^10` planck, but Paseo's eth-rpc uses **18-decimal
  wei** (`parseEther`). Bets will be 8 orders of magnitude too small until fixed.

---

## Phase 2 — The earn loop ✅ VIEW LOOP BUILT

The "earn while idle" loop is wired end-to-end for **view** claims (the core
mechanic). Click/action are gated by infra we haven't seeded (see below).

- `src/lib/datumClaims.ts` — builds a view claim, reads `lastNonce` +
  `lastClaimHash`, **mines the per-impression PoW** bound to the exact
  on-chain-derived claim hash (PoW is **enforced live** — verified the encoding
  matches the canonical reference and mining a real target takes ~0.4s), gets
  the user's EIP-712 `ClaimBatch`-range signature over the **DatumRelay** domain
  via MetaMask, and POSTs to `https://relay.javcon.io/relay/submit`. The relay
  co-signs the publisher side (Diana) and submits `settleClaimsFor`.
- `src/hooks/useEarnings.ts` + `earningsContext.tsx` + `EarningsPurse.tsx` —
  live `PaymentVault.userBalance` readout, claim driver (signs → waits for
  credit), and `withdrawUser()` button. Purse lives in the WalletBar.
- **Town Crier** (`MerchantStall`) accrues impressions while a creative is on
  screen; "Collect impressions" files one view claim → balance rises → "Collect"
  withdraws to wallet.
- **Denomination fix:** `TavernBetting.sol` (`1_000 ether`), `deploy.ts`
  (`parseEther`), `tavernBetting.ts` (`parseEther`) now use 18-decimal wei.

### Deferred (need extra infra — Phase 2.1)
- **Click claims** (`actionType 1`) need a ClickRegistry session, and
  `recordClick` is **relay-gated** — requires a relay click endpoint, not a
  user self-call. CTA is a plain link for now.
- **Action claims** (`actionType 2`) need the pot's `actionVerifier` to sign an
  `actionSig`; the seed sets `actionVerifier = address(0)`. To enable sponsored
  game actions, deploy/configure an action verifier and have it co-sign.
- The seed funds view+click+action pots; only the view pot is currently earnable.

### Still operator-run
8. Deploy `TavernBoard` + `TavernBetting` to Paseo (`npm run deploy`), fill their
   addresses in `src/lib/addresses.ts`, fund the house from Alice. (Needs keys.)

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
