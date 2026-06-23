// ─────────────────────────────────────────────────────────────────────────────
// Contract addresses + network config for the Datum Tavern demo.
//
// TWO groups of addresses:
//   1. Tavern-owned contracts (TavernBoard, TavernBetting) — fill after running
//      `npm run deploy`. These are demo-local and start at 0x000….
//   2. Datum protocol contracts (read + settle) — mirrored from
//      datum/alpha-core/deployed-addresses.json (network "polkadotTestnet" / Paseo).
//      Re-sync these whenever Datum redeploys.
//
//   3. tavernPublisher / seeded advertisers — filled by `scripts/seed-tavern.ts`
//      (Phase 1). Until seeded, the ad zones render empty gracefully.
// ─────────────────────────────────────────────────────────────────────────────

export const ADDRESSES = {
  // ── Tavern-owned (fill after deploy) ──────────────────────────────────────
  tavernBoard:   "0x0000000000000000000000000000000000000000",
  tavernBetting: "0x0000000000000000000000000000000000000000",

  // ── Datum protocol (Paseo / polkadotTestnet) ──────────────────────────────
  datumCampaigns:        "0xE0C1C18af2532af8b36E8DfB7A67A78744BdB07F",
  datumCampaignCreative: "0xd5FB31A85a02a91980b65B400db37867Ef984338",
  datumPublishers:       "0x86776018850b61c1e9202d73F031993818c33173",
  datumSettlement:       "0x7832E3c00643992d0811dd866d543A84Cff7Eb9f",
  datumDualSig:          "0x1341b8613d1ce62f9F542fd98e08ceDf83Cb24E9", // DatumDualSigSettlement (relay/earn path, Phase 2)
  datumClaimValidator:   "0x3bCb2D6fE89c8526577Ada23904495F4327b9153",
  datumRelay:            "0x7Db03df460B3A8E3079ff87014614898fECDbC5b",
  datumGovernanceRouter: "0xCcaE1A080D24e62962d7e830Db61709C1967F6D0", // adminActivateCampaign (Phase 0 gov)
  datumBudgetLedger:     "0xCA9411af5a30729D59eE2F46056021Ac9a2415a8",
  datumPaymentVault:     "0xe511B0E7e114671e452dA34fAeb1081bB5a413F8",
  datumPowEngine:        "0xE4E30FfF57f65645edE7b0F91ACca7A939EF0104", // per-impression PoW (enforced live)
  datumClickRegistry:    "0x5369a13873Cb9Dc3ad8670b5F357766cfb63d771", // click sessions (relay records, settlement claims)

  // ── Demo actors (filled by seed-tavern.ts, Phase 1) ───────────────────────
  // The tavern's publisher address, registered in DatumPublishers.
  tavernPublisher:       "0x0000000000000000000000000000000000000000",
} as const;

// ── Network / Paseo Asset Hub ────────────────────────────────────────────────
// Canonical values mirror datum/web/src/shared/networks.ts (polkadotTestnet).
export const PASEO_CHAIN_ID = 420420417; // 0x1900_0001
export const PASEO_RPC_URL  = "https://eth-rpc-testnet.polkadot.io/";
export const PASEO_EXPLORER = "https://blockscout-testnet.polkadot.io/";
export const PINE_CHAIN     = "paseo-asset-hub"; // smoldot light-client chain spec id

// IPFS gateway for resolving creative metadata CIDs.
export const IPFS_GATEWAY = "https://ipfs-datum.javcon.io/ipfs/";

// Settlement action types — mirrors IDatumSettlement.Claim.actionType.
export const ACTION_TYPE = {
  VIEW:   0, // idle impression
  CLICK:  1, // interacted with a creative
  ACTION: 2, // completed a sponsored in-game action
} as const;

// Datum relay endpoint (user-signed claims → POST /relay/submit). The relay
// co-signs the publisher side (Diana) and submits DatumRelay.settleClaimsFor.
export const RELAY_URL = "https://relay.javcon.io";

// Per-event clearing rates (wei). VIEW is read on-chain (getCampaignViewBid);
// CLICK/ACTION have no on-chain getter, so these MUST match the rates seeded by
// scripts/seed-tavern.mjs (claim.rateWei must be <= the campaign's pot rate).
export const CLAIM_RATE_WEI = {
  CLICK:  10_000_000_000_000_000n, // 0.01 PAS / click
  ACTION: 50_000_000_000_000_000n, // 0.05 PAS / action
} as const;
