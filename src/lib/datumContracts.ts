/**
 * datumContracts.ts — Read-only helpers for pulling Datum campaign creatives.
 *
 * Uses minimal inline ABIs (only the functions we call) so the tavern repo
 * doesn't need to copy the full alpha-core ABI set.
 *
 * Ads are surfaced every AD_INTERVAL message pulls.
 */

import { Contract } from "ethers";
import { getReadProvider } from "./pine";
import { ADDRESSES } from "./addresses";

export const AD_INTERVAL = 3; // show an ad every N message pulls

// ── Minimal ABIs ────────────────────────────────────────────────────────────

const CAMPAIGNS_ABI = [
  "function getActiveCampaigns() external view returns (uint256[])",
  "function getCampaignAdvertiser(uint256) external view returns (address)",
  "function getCampaignPublisher(uint256) external view returns (address)",
  "function getCampaignStatus(uint256) external view returns (uint8)",
];

const CREATIVE_ABI = [
  "function getCreative(uint256 campaignId) external view returns (bytes32 ipfsHash, bytes32 bulletinRef, uint64 expiresAt)",
];

// ── Types ────────────────────────────────────────────────────────────────────

export interface DatumAd {
  campaignId: bigint;
  advertiser: string;
  ipfsHash:   string; // hex bytes32 → resolve via IPFS gateway
  bulletinRef:string;
  expiresAt:  number;
}

// ── Ad pull counter (module-level, resets on page reload) ────────────────────
let _pullCount = 0;

/** Increment pull counter and return true if an ad should be shown. */
export function shouldShowAd(): boolean {
  _pullCount++;
  return _pullCount % AD_INTERVAL === 0;
}

// ── Fetching ─────────────────────────────────────────────────────────────────

let _cachedAds: DatumAd[] | null = null;

/** Fetch all active ads for this tavern's publisher address. Cached for the session. */
export async function fetchTavernAds(): Promise<DatumAd[]> {
  if (_cachedAds) return _cachedAds;

  const provider  = await getReadProvider();
  const campaigns = new Contract(ADDRESSES.datumCampaigns,       CAMPAIGNS_ABI, provider);
  const creative  = new Contract(ADDRESSES.datumCampaignCreative, CREATIVE_ABI,  provider);

  let ids: bigint[] = [];
  try {
    ids = await campaigns.getActiveCampaigns();
  } catch {
    // Contract not yet deployed or addresses not set — return empty
    return [];
  }

  const ads: DatumAd[] = [];
  for (const id of ids) {
    try {
      const publisher: string = await campaigns.getCampaignPublisher(id);
      if (publisher.toLowerCase() !== ADDRESSES.tavernPublisher.toLowerCase()) continue;

      const advertiser: string = await campaigns.getCampaignAdvertiser(id);
      const [ipfsHash, bulletinRef, expiresAt]: [string, string, bigint] =
        await creative.getCreative(id);

      ads.push({
        campaignId: id,
        advertiser,
        ipfsHash:    ipfsHash,
        bulletinRef: bulletinRef,
        expiresAt:   Number(expiresAt),
      });
    } catch { /* skip bad campaigns */ }
  }

  _cachedAds = ads;
  return ads;
}

/** Pick one ad at random from the cached set. Returns null if no ads. */
export async function pickRandomAd(): Promise<DatumAd | null> {
  const ads = await fetchTavernAds();
  if (ads.length === 0) return null;
  return ads[Math.floor(Math.random() * ads.length)];
}

/** Convert an IPFS bytes32 hash to a gateway URL. */
export function ipfsUrl(hash: string): string {
  // Strip leading 0x, interpret as hex-encoded CIDv0 multihash
  const hex = hash.startsWith("0x") ? hash.slice(2) : hash;
  return `https://ipfs.io/ipfs/f${hex}`;
}
