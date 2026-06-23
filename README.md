# The Rusty Flagon — Datum Tavern Demo

A single-page interactive tavern demonstrating unobtrusive p2p advertising inside a
game environment, powered by the [Datum Protocol](https://github.com/Baronvonbonbon/datum).

## What it is

A pixel-art tavern with four interactive zones:

| Zone | What it does |
|---|---|
| **Quest Board** | Mixed organic (on-chain + mock) messages. Sponsored Datum notices appear every 3 pulls. |
| **Barkeep** | NPC dialogue. Every 3rd line is a "whispered" Datum campaign. |
| **Town Crier** | Dedicated sponsored content from active Datum campaigns for this publisher. |
| **Game Table** | Six mini-games (dice, arm wrestling, darts, card draw, high/low card). Optional PAS wagers. |

## Contracts (separate from Datum)

| Contract | Purpose |
|---|---|
| `TavernBoard.sol` | On-chain message board. `post(text)` / `getMessage(id)` / `count()`. |
| `TavernBetting.sol` | P2P + vs-house wagering. Max 1 000 PAS. House funded at deploy. |

## Getting started

```bash
npm install

# Dev server (no contracts needed — mock data works without wallet)
npm run dev
```

## Deploy to Paseo

```bash
cp .env.example .env
# Fill in DEPLOYER_PRIVATE_KEY and HOUSE_FUND_PAS

npm run deploy
# Updates deployed-addresses.json
# Then update src/lib/addresses.ts with the new addresses
```

## After deploy

1. Copy addresses from `deployed-addresses.json` into `src/lib/addresses.ts`
2. Register the tavern publisher address in Datum's `DatumPublishers` contract
3. Fill in the Datum contract addresses in `src/lib/addresses.ts`
4. Add whitelisted advertisers via `DatumCampaignAllowlist`
5. Create campaigns for the tavern publisher — creatives will appear automatically

## Tech stack

- **Vite + React + TypeScript** — frontend
- **Pine RPC** (`pine-rpc`) — smoldot light-client EIP-1193 provider for Paseo Asset Hub
- **ethers.js v6** — contract calls and wallet signing
- **Hardhat** — contract compilation and deploy script
- **No backend** — messages in `localStorage`, Datum reads via Pine, bets on-chain

## Wallet support

Any EIP-1193 browser wallet: MetaMask, Talisman, Nova Wallet, Polkadot.js extension.
Wallet is optional — the tavern works in read-only mode without one.
