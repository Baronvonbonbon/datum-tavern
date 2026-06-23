/**
 * datumContracts.ts — read-only helpers for pulling Datum campaign creatives.
 *
 * Rewritten against the REAL alpha-core contract surface (the previous version
 * called getActiveCampaigns()/getCreative() — neither of which exists).
 *
 * The real flow:
 *   1. Enumerate campaign ids 1 .. nextCampaignId()-1 on DatumCampaigns.
 *   2. Keep the ones whose publisher == our tavern AND status == Active.
 *   3. Read the bytes32 metadataHash from DatumCampaignCreative.campaignMetadata.
 *   4. Resolve that hash → CIDv0 → IPFS JSON { title, description, creativeText,
 *      cta, ctaUrl, imageUrl } and resolve imageUrl through the gateway too.
 *
 * Uses minimal inline ABIs (only the functions we call) so the tavern repo
 * doesn't copy the full alpha-core ABI set. Mirror these if Datum changes.
 */

import { Contract } from "ethers";
import { getReadProvider } from "./pine";
import { ADDRESSES, IPFS_GATEWAY } from "./addresses";
import { bytes32ToCid, metadataUrl, ZERO_HASH } from "./ipfs";

export const AD_INTERVAL = 3; // surface a sponsored notice every N message pulls

// CampaignStatus enum (IDatumCampaigns): 0 Pending, 1 Active, 2 Paused, …
const STATUS_ACTIVE = 1;

// ── Minimal ABIs ─────────────────────────────────────────────────────────────

const CAMPAIGNS_ABI = [
  "function nextCampaignId() view returns (uint256)",
  "function getCampaignPublisher(uint256) view returns (address)",
  "function getCampaignAdvertiser(uint256) view returns (address)",
  "function getCampaignStatus(uint256) view returns (uint8)",
  "function getCampaignViewBid(uint256) view returns (uint256)",
];

const CREATIVE_ABI = [
  "function campaignMetadata(uint256) view returns (bytes32)",
];

// ── Types ────────────────────────────────────────────────────────────────────

/** A resolved, displayable sponsored creative for the tavern. */
export interface DatumAd {
  campaignId:  bigint;
  advertiser:  string;
  publisher:   string;
  viewBidWei:  bigint;   // CPM ceiling (per-1000 views), in planck
  metadataHash:string;   // bytes32 hex
  // resolved IPFS creative fields (best-effort; "" when unavailable)
  title:       string;
  description: string;
  body:        string;   // creativeText
  cta:         string;
  ctaUrl:      string;
  imageUrl:    string;   // gateway URL or "" if none
}

interface CreativeMeta {
  title?: string;
  description?: string;
  creativeText?: string;
  cta?: string;
  ctaUrl?: string;
  imageUrl?: string;
  creative?: { title?: string };
}

// ── Ad pull counter (module-level, resets on page reload) ─────────────────────
let _pullCount = 0;

/** Increment pull counter; true if a sponsored notice should be shown. */
export function shouldShowAd(): boolean {
  _pullCount++;
  return _pullCount % AD_INTERVAL === 0;
}

// ── Metadata resolution ───────────────────────────────────────────────────────

async function fetchCreativeMeta(metadataHash: string): Promise<CreativeMeta> {
  if (!metadataHash || metadataHash === ZERO_HASH) return {};
  let cid: string;
  try {
    cid = bytes32ToCid(metadataHash);
  } catch {
    return {};
  }
  const url = `${IPFS_GATEWAY.replace(/\/$/, "")}/${cid}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    if (!res.ok) return {};
    return (await res.json()) as CreativeMeta;
  } catch {
    return {};
  } finally {
    clearTimeout(timeout);
  }
}

/** Resolve a possibly-CID imageUrl field to a gateway URL. */
function resolveImage(imageUrl?: string): string {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http")) return imageUrl;
  if (imageUrl.startsWith("ipfs://")) {
    return `${IPFS_GATEWAY.replace(/\/$/, "")}/${imageUrl.slice("ipfs://".length)}`;
  }
  if (imageUrl.startsWith("Qm")) {
    return `${IPFS_GATEWAY.replace(/\/$/, "")}/${imageUrl}`;
  }
  return imageUrl;
}

// ── Fetching ─────────────────────────────────────────────────────────────────

let _cachedAds: DatumAd[] | null = null;

/**
 * Fetch all Active campaigns whose publisher is this tavern, with creatives
 * resolved. Cached for the session. Returns [] on any read failure (e.g.
 * addresses not yet wired) so the UI degrades gracefully.
 */
export async function fetchTavernAds(): Promise<DatumAd[]> {
  if (_cachedAds) return _cachedAds;

  const tavern = ADDRESSES.tavernPublisher.toLowerCase();
  // Nothing to match against yet — skip the chain round-trips.
  if (tavern === "0x0000000000000000000000000000000000000000") {
    _cachedAds = [];
    return _cachedAds;
  }

  let ads: DatumAd[] = [];
  try {
    const provider  = await getReadProvider();
    const campaigns = new Contract(ADDRESSES.datumCampaigns,        CAMPAIGNS_ABI, provider);
    const creative  = new Contract(ADDRESSES.datumCampaignCreative, CREATIVE_ABI,  provider);

    const next: bigint = await campaigns.nextCampaignId();

    // Phase 1: collect matching ids + on-chain fields.
    const matches: Omit<DatumAd, "title" | "description" | "body" | "cta" | "ctaUrl" | "imageUrl">[] = [];
    for (let id = 1n; id < next; id++) {
      try {
        const publisher: string = await campaigns.getCampaignPublisher(id);
        if (publisher.toLowerCase() !== tavern) continue;

        const status: bigint = await campaigns.getCampaignStatus(id);
        if (Number(status) !== STATUS_ACTIVE) continue;

        const [advertiser, viewBid, metadataHash] = await Promise.all([
          campaigns.getCampaignAdvertiser(id),
          campaigns.getCampaignViewBid(id).catch(() => 0n),
          creative.campaignMetadata(id).catch(() => ZERO_HASH),
        ]);

        matches.push({
          campaignId: id,
          advertiser: String(advertiser),
          publisher,
          viewBidWei: BigInt(viewBid),
          metadataHash: String(metadataHash),
        });
      } catch {
        /* skip unreadable campaign */
      }
    }

    // Phase 2: resolve creatives off-chain (IPFS) in parallel.
    ads = await Promise.all(
      matches.map(async (m) => {
        const meta = await fetchCreativeMeta(m.metadataHash);
        return {
          ...m,
          title:       meta.title ?? meta.creative?.title ?? "",
          description: meta.description ?? "",
          body:        meta.creativeText ?? "",
          cta:         meta.cta ?? "",
          ctaUrl:      meta.ctaUrl ?? "",
          imageUrl:    resolveImage(meta.imageUrl),
        };
      }),
    );
  } catch {
    ads = [];
  }

  _cachedAds = ads;
  return ads;
}

/** Pick one ad at random from the cached set. Returns null if none. */
export async function pickRandomAd(): Promise<DatumAd | null> {
  const ads = await fetchTavernAds();
  if (ads.length === 0) return null;
  return ads[Math.floor(Math.random() * ads.length)];
}

/** Force the next fetchTavernAds() to re-read the chain. */
export function invalidateAdCache(): void {
  _cachedAds = null;
}

/** Resolve a bytes32 metadata hash to a gateway URL (debugging / Console). */
export function metadataGatewayUrl(hash: string): string | null {
  return metadataUrl(hash, IPFS_GATEWAY);
}
