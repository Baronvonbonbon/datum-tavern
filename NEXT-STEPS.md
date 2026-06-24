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

## Phase 2.1 — Click + action claims ✅ BUILT (needs updated relay deployed)

Both extra earning paths are now wired client-side and validated offline
(action-sig recovery + claim-hash encoding confirmed).

- **Click** (`actionType 1`): `datumClaims.recordClickSession` generates a random
  impression nonce, POSTs `{user, campaignId, nonce}` to the relay `/click`,
  polls `ClickRegistry.hasUnclaimed` until the relay's `recordClick` lands, then
  files a click claim with `clickSessionHash == nonce` (also bound into the PoW
  preimage). The Town Crier CTA fires this in the background (link still opens).
- **Action** (`actionType 2`): `datumClaims.attestAction` POSTs to the relay
  `/action-attest`; the relay's action-verifier reads the on-chain nonce/prevHash,
  signs the claim's `computedHash` (EIP-191), and returns `{actionSig, firstNonce,
  prevHash}`. The Game Table's "Complete sponsored action" button files it.

### Relay changes (separate repo — opened as a PR)
The canonical relay (`datum/relay-bot.example`) was extended:
- `/click` now accepts a wallet-aware `{user, campaignId, nonce}` (echoes the
  nonce, eager-flushes) so the claim can reference the exact session.
- New `POST /action-attest` + `ACTION_VERIFIER_KEY` env → signs `computedHash`.

### Live verification (2026-06-24) — all three paths settle ✅
Seeded campaigns #85–#89 (publisher `0x749aC2…`) and tested end-to-end on Paseo:
- **VIEW** ✅ 0.0045 PAS for 10 views (1 PAS CPM, −40% take, ×75% user share).
- **CLICK** ✅ 0.0045 PAS (relay `/click` records the session; claim binds `clickSessionHash`).
- **ACTION** ✅ 0.0225 PAS (relay `/action-attest` signs with the verifier key).

Hard-won settlement gotchas (all now handled):
- The relay path (`settleClaimsFor`) checks the publisher cosig against the
  campaign **publisher address itself**, NOT `relaySigner`. So the relay must
  either be the publisher or send an **empty** cosig (assurance-0); the client
  sends `expectedRelaySigner = address(0)`. (relaySigner only matters on the
  separate dual-sig path.)
- Publisher must be **staked** (`DatumPublisherStake`), and `requiredStake`
  grows with settled impressions — stake with headroom (the seed now does, 50 PAS).
- The live relay (`relay-bot.mjs`) was extended with `/click` + `/action-attest`,
  only auto-signs a publisher cosig when it IS the campaign publisher, and
  `ClickRegistry.setRelay(botEOA)` was called so it can record clicks.

### One-time owner wiring done (2026-06-24)
`DatumClaimValidator.clickRegistry` was `address(0)` on the live deploy, so click
claims were rejected (reason 22) protocol-wide. The owner called
`claimValidator.setClickRegistry(0x5369…)` — clicks now settle.

### Notes
- Client rates (`CLAIM_RATE_WEI`) must stay ≤ the seeded pot rates (click 0.01,
  action 0.05 PAS).
- The relay runs as a systemd user service (see "Relay persistence" below).

### Still operator-run
8. Deploy `TavernBoard` + `TavernBetting` to Paseo (`npm run deploy`), fill their
   addresses in `src/lib/addresses.ts`, fund the house from Alice. (Needs keys.)

---

## Phase 3 — Contract Console ✅ DONE

A **Contract Console** view (toggle in the wallet bar: ⚙ Console / 🍺 Tavern)
with grouped panels exposing every function — inputs, call/submit buttons, and
an inline status/result readout per call:
- **TavernBoard**: `count`, `getMessage(id)`, `post(text)`.
- **TavernBetting**: `gameCount`, `houseBalance`, `getGame(id)`, `createGame`
  (vs-house + P2P), `joinGame(id)`, `cancelGame(id)`.
- **Datum**: active tavern campaigns, `PaymentVault.userBalance`,
  `submitClaim(campaignId, actionType, eventCount)`, `withdrawUser`.

Reads are free; writes prompt MetaMask. Built on a shared `useAsyncAction` hook
(idle → pending → success/error) + `ConsoleAction` component.

### Submit-status readout across the app
Every user-submit surface now reports status: the earnings purse + Town Crier +
Game Table (claim/withdraw via `useEarnings.status`), the betting modal
(pending/result/error), and the Quest Board post (now on `useAsyncAction`). Also
fixed a leftover `10^10` denomination bug in the betting payout display.

---

## Phase 4 — Polish ✅ DONE

- **Per-zone on-chain explainer** (`OnChainNote`, collapsible) in all four zones —
  names the integration pattern + contracts so a visitor sees what happened
  on-chain. The actual tech-demo takeaway.
- **IPFS image fallback**: the Town Crier renders a parchment title-card when a
  creative has no image or the gateway is unreachable (instead of a blank).
- **Error states**: `useDatumCampaigns` now surfaces a chain-read error; the
  Town Crier shows a clear "couldn't read the chain" message vs. an empty board.
- Loading states retained.

## Relay persistence ✅ DONE
The live relay runs as a **systemd user service** (`~/.config/systemd/user/datum-relay.service`),
`enabled` with user-linger on, so it restarts on failure and survives reboot/logout.
Manage with `systemctl --user {status,restart,stop} datum-relay` and
`journalctl --user -u datum-relay -f`. (It runs `relay-bot/relay-bot.mjs`, the
gitignored live file; the canonical equivalent is `relay-bot.example`.)

---

## Address sync reminder

Two sources of truth, both to update on a Datum redeploy:
- `src/lib/addresses.ts` — Datum protocol addresses (mirror
  `datum/alpha-core/deployed-addresses.json`, network `polkadotTestnet`).
- Tavern-owned addresses (`tavernBoard`, `tavernBetting`, `tavernPublisher`) —
  set after `npm run deploy` + `scripts/seed-tavern.ts`.
