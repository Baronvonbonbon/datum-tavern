# 🍺 The Rusty Flagon — Datum Tavern

A playable tech demo of **immersive, non-intrusive sponsored content inside a
blockchain game**, powered by the [Datum Protocol](https://github.com/Baronvonbonbon/datum)
on Paseo Asset Hub.

It answers one question: *can on-chain ads pay players without wrecking the
experience?* The tavern shows four different ways to weave sponsored content into
a game, and lets you **earn a real revenue share** for the attention you give it.

> **Live demo:** https://baronvonbonbon.github.io/datum-tavern/
> Connect MetaMask on **Paseo Asset Hub** (chain id `420420417`). Wallet optional —
> the tavern is fully browsable read-only.

---

## The four integration patterns

| Zone | Pattern | What's on-chain |
|---|---|---|
| 📜 **Quest Board** | Native ads inline with user notices | `TavernBoard` posts + a Datum campaign creative woven in every few pulls |
| 🍺 **Barkeep** | Conversational / NPC-dialogue sponsorship | every ~3rd line is a "whispered" Datum campaign |
| 📯 **Town Crier** | Dedicated billboard + **earn while idle** | impressions accrue → a view-claim settles → your wallet earns |
| 🎲 **Game Table** | Gameplay kept separate from ads | wagers use your own PAS (`TavernBetting`); sponsored rounds pay a Datum action-claim |

Each zone has a collapsible **"What's happening on-chain?"** note explaining the
mechanism — that's the takeaway for a technical audience.

## The earn loop (how you get paid)

The connected wallet is the Datum **user**. Viewing/clicking/completing sponsored
actions accrues events you settle for a native-PAS revenue share:

```
view / click / action  →  EIP-712 claim (MetaMask)  →  relay co-signs + submits
   →  DatumSettlement splits the advertiser's budget  →  PaymentVault.userBalance
   →  Collect (withdrawUser) sends it to your wallet
```

Settlement credits **both** the publisher (the tavern) and **you** (the viewer).
Per-impression PoW is mined in the browser; the relay submits, so **you never pay
gas to earn** — you only sign.

Verified live on Paseo: a view earns ~0.0045 PAS / 10 views, a click ~0.0045 PAS,
a sponsored action ~0.0225 PAS (rates are demo values).

---

## 🎬 Demo script (≈4 minutes)

A suggested walkthrough for showing it off:

1. **Open** the live demo. The pixel-art tavern loads; four hotspots glow.
   *Say:* "Everything here reads live from Paseo — campaigns, creatives, balances."

2. **Connect MetaMask** (top-right). Approve the Paseo network if prompted. A
   **🪙 purse** appears in the wallet bar — your accrued ad-revenue share (starts 0).

3. **📯 Town Crier** — click it. A real sponsored creative renders (e.g. *Ironforge
   Smithy*), fetched from the campaign's on-chain metadata via IPFS.
   - Watch the **👁 impressions** counter tick up — "earning while idle."
   - Hit **Collect impressions** → sign in MetaMask. Status walks through
     *mining proof → awaiting signature → settling → coin in the purse* 🪙.
   - The purse balance rises. *Say:* "That's the advertiser's budget paying me,
     split with the tavern, settled on-chain by a relay — I only signed."
   - Expand **"What's happening on-chain?"** to show the contracts involved.

4. **🎲 Game Table** — pick a game (e.g. Dice).
   - **Place a Wager** vs the house — note this uses *your own* PAS, totally
     separate from the ad economy.
   - **🎁 Complete sponsored action** → another claim settles into your purse.
     *Say:* "Different ad format — a rewarded action — same on-chain settlement."

5. **📜 Quest Board** → **Pull New Messages**. Organic notices mix with a
   gold-sealed **sponsored quest**. *Say:* "Native placement — the ad reads as
   content, and viewing it still earns." Optionally **Post a Notice** (on-chain).

6. **🍺 Barkeep** → **Talk** a few times until a 📣 whispered sponsorship appears.

7. **Collect** in the purse (top bar) → `withdrawUser` sends earnings to your
   wallet. *Say:* "Pull my share out any time."

8. **⚙ Console** (top bar) — flip to the Contract Console. Every TavernBoard /
   TavernBetting / Datum function is callable with live status readouts.
   *Say:* "Nothing's hidden — here's the raw contract surface behind the game."

**One-liner:** *players earn for attention, advertisers pay for verified
impressions, and the game stays immersive — all settled on-chain.*

---

## How it works

- **Frontend:** Vite + React + TypeScript, single-page (no backend).
- **Reads:** the [Pine](https://github.com/Baronvonbonbon/pine-rpc) smoldot
  light-client (trustless, in-browser). **Writes/signing:** MetaMask.
- **Contracts:**
  - *Tavern-owned* — `TavernBoard` (message board), `TavernBetting` (P2P / vs-house wagers).
  - *Datum protocol* — campaigns, creatives, settlement, payment vault, relay,
    click registry, PoW engine (addresses in `src/lib/addresses.ts`).
- **Relay:** the user signs a claim; a relay co-signs the publisher side and
  submits `DatumRelay.settleClaimsFor` (so the user pays no gas). The relay also
  records click sessions and attests sponsored actions.

---

## Local development

```bash
npm install          # needs the pine-rpc sibling at ../pine-rpc
npm run dev          # http://localhost:5174
```

Mock data + read-only campaigns work without a wallet. To exercise the earn loop
locally, connect MetaMask on Paseo and ensure the relay is reachable.

`npm run build` → typecheck + production bundle in `dist/`.

---

## Publishing to GitHub Pages (the easy way)

This repo ships a GitHub Actions workflow (`.github/workflows/deploy-pages.yml`)
that builds and deploys on every push to `master`. One-time setup:

1. **Repo → Settings → Pages → Build and deployment → Source: “GitHub Actions”.**
2. Push to `master` (or run the workflow manually from the **Actions** tab).
3. The site goes live at `https://<you>.github.io/datum-tavern/`.

The workflow checks out the `pine-rpc` sibling repo, builds it, then builds the
tavern with the correct base path (`/datum-tavern/`). No secrets needed — the app
is static and talks to Paseo/relay/IPFS from the browser.

> Forking or renaming the repo? Update the base in the `build:pages` script
> (`--base=/<your-repo>/`) so assets resolve.

**Manual alternative:** `npm run build:pages` then publish `dist/` with the
[`gh-pages`](https://www.npmjs.com/package/gh-pages) package or any static host.

---

## Deploy & seed (operator)

To stand up your own publisher + campaigns, see **`NEXT-STEPS.md`** (the full
build log + runbook). In short:

```bash
cp .env.example .env          # ALICE_KEY, ADVERTISER_KEY, RELAY_SIGNER_ADDR, …
npm run deploy                # deploy TavernBoard + TavernBetting to Paseo
npm run seed                  # register publisher, stake, create campaigns (IPFS node required)
# then paste the printed tavernPublisher into src/lib/addresses.ts
```

The relay runs as a `systemd --user` service (`datum-relay`); details in `NEXT-STEPS.md`.

---

## Repo layout

```
src/
  components/        tavern zones, games, Console, OnChainNote, EarningsPurse
  hooks/             useWallet, useEarnings, useDatumCampaigns, useAsyncAction
  lib/               addresses, pine, datumContracts (reads), datumClaims (earn),
                     tavernBoard, tavernBetting, ipfs
contracts/           TavernBoard.sol, TavernBetting.sol
scripts/             deploy.ts, seed-tavern.mjs
.github/workflows/   deploy-pages.yml
NEXT-STEPS.md        plan, build log, and operator runbook
```

## License

GPL-3.0-or-later (matches the Datum protocol contracts).
