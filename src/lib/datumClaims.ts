/**
 * datumClaims.ts — the earn loop.
 *
 * The connected MetaMask wallet is the Datum `user`. Viewing ads (idle),
 * clicking a creative, or completing a sponsored game action accrues events the
 * user can settle for a native-PAS revenue share.
 *
 * Flow (DatumRelay path — the relay co-signs the publisher side with Diana's key
 * and submits DatumRelay.settleClaimsFor):
 *   1. firstNonce = DatumSettlement.lastNonce(user, campaignId, actionType) + 1
 *   2. deadlineBlock = current block + DEADLINE_WINDOW
 *   3. user signs an EIP-712 ClaimBatch *range* over the DatumRelay domain
 *   4. POST { batches:[…] } to RELAY_URL/relay/submit
 *   5. relay queues + flushes on-chain; poll PaymentVault.userBalance for credit
 *
 * Earnings are withdrawn with PaymentVault.withdrawUser().
 */

import { Contract, Signer, Provider, AbiCoder, keccak256, hexlify, randomBytes } from "ethers";
import { getReadProvider } from "./pine";
import { ADDRESSES, RELAY_URL, CLAIM_RATE_WEI, ACTION_TYPE, PASEO_TX } from "./addresses";

const ZERO = "0x0000000000000000000000000000000000000000";
const ZERO_HASH = "0x" + "0".repeat(64);
const ZERO_SIG3 = [ZERO_HASH, ZERO_HASH, ZERO_HASH];
const DEADLINE_WINDOW = 1000n; // blocks until the signed batch expires
const POW_BUDGET = 20_000_000; // max hashes to try before giving up

type ActionType = (typeof ACTION_TYPE)[keyof typeof ACTION_TYPE];

// ── ABIs ─────────────────────────────────────────────────────────────────────
const SETTLEMENT_ABI = [
  "function lastNonce(address user, uint256 campaignId, uint8 actionType) view returns (uint256)",
  "function lastClaimHash(address user, uint256 campaignId, uint8 actionType) view returns (bytes32)",
];
const CAMPAIGNS_ABI = [
  "function getCampaignViewBid(uint256) view returns (uint256)",
  "function getCampaignRelaySigner(uint256) view returns (address)",
];
const VAULT_ABI = [
  "function userBalance(address) view returns (uint256)",
  "function withdrawUser()",
];
const POW_ABI = [
  "function enforcePow() view returns (bool)",
  "function powTargetForUser(address user, uint256 eventCount) view returns (uint256)",
];
const CLICKREG_ABI = [
  "function hasUnclaimed(address user, uint256 campaignId, bytes32 impressionNonce) view returns (bool)",
];

// The on-chain claim-hash preimage (DatumClaimValidator: 10 abi.encode fields).
// The contract derives nonce + prevHash itself, so we must mirror them exactly.
// For a click claim, clickSessionHash carries the recorded impression nonce.
function computeClaimHash(args: {
  campaignId: bigint; publisher: string; user: string; eventCount: bigint;
  rateWei: bigint; actionType: number; nonce: bigint; prevHash: string;
  clickSessionHash?: string;
}): string {
  return keccak256(AbiCoder.defaultAbiCoder().encode(
    ["uint256", "address", "address", "uint256", "uint256", "uint8", "bytes32", "uint256", "bytes32", "bytes32"],
    [args.campaignId, args.publisher, args.user, args.eventCount, args.rateWei,
      args.actionType, args.clickSessionHash ?? ZERO_HASH, args.nonce, args.prevHash, ZERO_HASH /*stakeRootUsed*/],
  ));
}

// ── relay helpers (click session + action attestation) ───────────────────────

/** Record a user-attributable click session via the relay, then wait for it to
 *  land on-chain. Returns the impression nonce to put in the claim, or null. */
async function recordClickSession(user: string, campaignId: bigint): Promise<string | null> {
  const nonce = hexlify(randomBytes(32));
  try {
    const res = await fetch(`${RELAY_URL}/click`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user, campaignId: campaignId.toString(), nonce }),
    });
    if (!(res.ok || res.status === 202)) return null;
  } catch {
    return null;
  }
  // Wait for the relay to mine recordClick (clickRegistry.hasUnclaimed → true).
  const read = await getReadProvider();
  const reg = new Contract(ADDRESSES.datumClickRegistry, CLICKREG_ABI, read);
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    try { if (await reg.hasUnclaimed(user, campaignId, nonce)) return nonce; } catch { /* retry */ }
  }
  return null;
}

interface ActionAttestation { actionSig: string[]; firstNonce: bigint; prevHash: string; }

/** Ask the relay's action verifier to attest a type-2 claim. */
async function attestAction(
  user: string, campaignId: bigint, eventCount: bigint, rateWei: bigint,
): Promise<ActionAttestation | null> {
  try {
    const res = await fetch(`${RELAY_URL}/action-attest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        user, campaignId: campaignId.toString(), eventCount: eventCount.toString(),
        rateWei: rateWei.toString(), publisher: ADDRESSES.tavernPublisher,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.ok) return null;
    return { actionSig: body.actionSig, firstNonce: BigInt(body.firstNonce), prevHash: String(body.prevHash) };
  } catch {
    return null;
  }
}

// Mine a powNonce so keccak256(claimHash || powNonce) <= target (matches the
// validator's abi.encodePacked(computedHash, powNonce) PoW check).
function minePowNonce(claimHash: string, target: bigint): string | null {
  const base = claimHash.slice(2);
  for (let i = 0; i < POW_BUDGET; i++) {
    const nh = i.toString(16).padStart(64, "0");
    if (BigInt(keccak256("0x" + base + nh)) <= target) return "0x" + nh;
  }
  return null;
}

// EIP-712: matches DatumRelay.BATCH_TYPEHASH — the user signs the nonce RANGE.
const CLAIM_BATCH_TYPES = {
  ClaimBatch: [
    { name: "user",          type: "address" },
    { name: "campaignId",    type: "uint256" },
    { name: "firstNonce",    type: "uint256" },
    { name: "lastNonce",     type: "uint256" },
    { name: "claimCount",    type: "uint256" },
    { name: "deadlineBlock", type: "uint256" },
  ],
};

export interface ClaimResult {
  ok: boolean;
  status: number;
  message: string;
}

/** The clearing rate (wei) for a given action type on a campaign. */
async function rateFor(provider: Provider, campaignId: bigint, actionType: ActionType): Promise<bigint> {
  if (actionType === ACTION_TYPE.VIEW) {
    const campaigns = new Contract(ADDRESSES.datumCampaigns, CAMPAIGNS_ABI, provider);
    return BigInt(await campaigns.getCampaignViewBid(campaignId));
  }
  return actionType === ACTION_TYPE.CLICK ? CLAIM_RATE_WEI.CLICK : CLAIM_RATE_WEI.ACTION;
}

/**
 * Build, sign (MetaMask), and submit a single-claim batch to the relay.
 * `eventCount` = number of events (impressions for VIEW; 1 for a click/action).
 * The signing wallet must be the `user`.
 */
export async function submitClaim(
  signer: Signer,
  campaignId: bigint,
  actionType: ActionType,
  eventCount: bigint,
): Promise<ClaimResult> {
  if (eventCount <= 0n) return { ok: false, status: 0, message: "nothing to claim" };

  const user = await signer.getAddress();
  const read = await getReadProvider();

  const settlement = new Contract(ADDRESSES.datumSettlement, SETTLEMENT_ABI, read);
  const pow        = new Contract(ADDRESSES.datumPowEngine,  POW_ABI,        read);

  const [last, prevHashChain, rateWei, head, powEnforced] = await Promise.all([
    settlement.lastNonce(user, campaignId, actionType).then(BigInt),
    settlement.lastClaimHash(user, campaignId, actionType).then(String),
    rateFor(read, campaignId, actionType),
    read.getBlockNumber().then(BigInt),
    pow.enforcePow().then(Boolean).catch(() => true), // fail-closed: assume on
  ]);
  // address(0): the relay path settles on the user sig alone (publisher cosig
  // optional at assurance level 0). A non-zero value demands a matching
  // publisher cosig, which the relay can't produce for a delegated publisher.
  const expectedRelaySigner = ZERO;

  if (rateWei <= 0n) return { ok: false, status: 0, message: "campaign has no rate for this action" };

  // Per-action-type extras: click needs a recorded session; action needs a
  // verifier signature over the claim hash (which fixes nonce + prevHash).
  let clickSessionHash = ZERO_HASH;
  let actionSig = ZERO_SIG3;
  let firstNonce = last + 1n;
  let prevHash = prevHashChain;

  if (actionType === ACTION_TYPE.CLICK) {
    const nonce = await recordClickSession(user, campaignId);
    if (!nonce) return { ok: false, status: 0, message: "couldn't record click with the relay" };
    clickSessionHash = nonce;
  } else if (actionType === ACTION_TYPE.ACTION) {
    const att = await attestAction(user, campaignId, eventCount, rateWei);
    if (!att) return { ok: false, status: 0, message: "action verifier unavailable" };
    actionSig = att.actionSig;
    firstNonce = att.firstNonce; // relay signed the hash at THIS position
    prevHash = att.prevHash;
  }

  const deadlineBlock = head + DEADLINE_WINDOW;
  const chainId = BigInt((await read.getNetwork()).chainId);

  // Per-event PoW (enforced live for every action type). Mine a nonce bound to
  // the exact claim hash the contract derives. Rejected (reason 27) without it.
  let powNonce = ZERO_HASH;
  if (powEnforced) {
    const target = BigInt(await pow.powTargetForUser(user, eventCount));
    const claimHash = computeClaimHash({
      campaignId, publisher: ADDRESSES.tavernPublisher, user, eventCount,
      rateWei, actionType, nonce: firstNonce, prevHash, clickSessionHash,
    });
    const mined = minePowNonce(claimHash, target);
    if (!mined) return { ok: false, status: 0, message: "PoW too hard — try fewer events" };
    powNonce = mined;
  }

  const domain = {
    name: "DatumRelay",
    version: "1",
    chainId,
    verifyingContract: ADDRESSES.datumRelay,
  };
  const value = {
    user,
    campaignId,
    firstNonce,
    lastNonce: firstNonce, // single claim → range collapses to firstNonce
    claimCount: 1n,
    deadlineBlock,
  };

  const userSig = await signer.signTypedData(domain, CLAIM_BATCH_TYPES, value);

  // A proof entry is needed whenever PoW is on or the claim carries click/action
  // material. With PoW enforced live, that's always.
  const needsProof = powEnforced || actionType !== ACTION_TYPE.VIEW;
  const envelope = {
    user,
    campaignId: campaignId.toString(),
    firstNonce: firstNonce.toString(),
    deadlineBlock: deadlineBlock.toString(),
    expectedRelaySigner,
    expectedAdvertiserRelaySigner: ZERO,
    userSig,
    claims: [
      {
        publisher: ADDRESSES.tavernPublisher,
        eventCount: eventCount.toString(),
        rateWei: rateWei.toString(),
        actionType,
        proof: needsProof
          ? [{
              clickSessionHash,
              stakeRootUsed: ZERO_HASH,
              nullifier: ZERO_HASH,
              powNonce,
              zkProof: Array(8).fill(ZERO_HASH),
              actionSig,
            }]
          : [],
      },
    ],
  };

  let res: Response;
  try {
    res = await fetch(`${RELAY_URL}/relay/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ batches: [envelope] }),
    });
  } catch (e) {
    return { ok: false, status: 0, message: e instanceof Error ? e.message : "relay unreachable" };
  }

  const body = await res.json().catch(() => ({}));
  if (res.ok || res.status === 202) {
    return { ok: true, status: res.status, message: "claim accepted — settling shortly" };
  }
  return { ok: false, status: res.status, message: body?.error ?? `relay rejected (${res.status})` };
}

/** The user's accrued (unwithdrawn) earnings in the PaymentVault, in wei. */
export async function getUserBalance(user: string): Promise<bigint> {
  const read = await getReadProvider();
  const vault = new Contract(ADDRESSES.datumPaymentVault, VAULT_ABI, read);
  return BigInt(await vault.userBalance(user));
}

/** Withdraw accrued earnings to the user's wallet (MetaMask tx). */
export async function withdrawEarnings(signer: Signer): Promise<void> {
  const vault = new Contract(ADDRESSES.datumPaymentVault, VAULT_ABI, signer);
  const tx = await vault.withdrawUser(PASEO_TX);
  await tx.wait();
}

/**
 * Poll the user's vault balance until it rises above `baseline` (relay settles
 * asynchronously) or the timeout elapses. Returns the final balance.
 */
export async function waitForCredit(user: string, baseline: bigint, timeoutMs = 60_000): Promise<bigint> {
  const deadline = Date.now() + timeoutMs;
  let bal = baseline;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    bal = await getUserBalance(user).catch(() => bal);
    if (bal > baseline) return bal;
  }
  return bal;
}
