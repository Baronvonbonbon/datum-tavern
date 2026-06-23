/**
 * ipfs.ts — bytes32 ⇄ CIDv0 helpers for Datum creative metadata.
 *
 * Datum stores a campaign's creative as `bytes32 metadataHash` on-chain
 * (DatumCampaignCreative.campaignMetadata). That hash is the raw 32-byte
 * SHA-256 digest of a CIDv0 ("Qm…") with the 0x1220 multihash prefix stripped.
 * To fetch the creative JSON we re-attach the prefix, base58-encode back to a
 * CID, and resolve it through an IPFS gateway.
 *
 * Ported from datum/web/src/shared/ipfs.ts — keep in sync if the encoding changes.
 */

import { encodeBase58, getBytes } from "ethers";

export const ZERO_HASH = "0x" + "0".repeat(64);

/** Convert a 0x-prefixed bytes32 digest back to a CIDv0 string ("Qm…"). */
export function bytes32ToCid(hex: string): string {
  const digest = getBytes(hex);
  if (digest.length !== 32) throw new Error("Expected 32-byte digest");
  // CIDv0 = 0x12 (sha2-256) + 0x20 (32-byte length) + digest
  const full = new Uint8Array(34);
  full[0] = 0x12;
  full[1] = 0x20;
  full.set(digest, 2);
  return encodeBase58(full);
}

/**
 * Resolve a bytes32 metadata hash to a full IPFS gateway URL.
 * Returns null for the zero hash (no metadata set) or a malformed gateway.
 */
export function metadataUrl(hex: string, gateway: string): string | null {
  if (!hex || hex === ZERO_HASH) return null;
  try {
    const parsed = new URL(gateway);
    const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (!isLocal && parsed.protocol !== "https:") return null;
  } catch {
    return null;
  }
  const cid = bytes32ToCid(hex);
  const gw = gateway.endsWith("/") ? gateway : gateway + "/";
  return gw + cid;
}
