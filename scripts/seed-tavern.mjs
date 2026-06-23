// seed-tavern.mjs — Phase 1: stand up the Datum data the tavern reads.
//
// Registers a NEW fantasy-tavern publisher, delegates its on-chain relaySigner
// to the existing live relay key (Diana) so the running relay can settle for it,
// then deploys a set of fantasy-merchant campaigns (advertiser = Bob, the
// established/staked advertiser whose key the relay also holds). Each campaign:
//   - funds VIEW + CLICK + ACTION pots (budget tied to each event type)
//   - uploads a themed SVG creative + creative-metadata JSON to the local IPFS
//     (Kubo) node, committed on-chain via DatumCampaignCreative.setMetadata
//   - is activated instantly via DatumGovernanceRouter.adminActivateCampaign
//     (Phase 0 admin governance; alice = owner).
//
// Reads addresses from the Datum repo's deployed-addresses.json. Funds gas/budget
// from the Datum Alice account. Uses the raw JsonRpcProvider + nonce-poll pattern
// (Paseo receipt bug), mirroring alpha-core/scripts/reseed-demo.mjs.
//
//   node scripts/seed-tavern.mjs                 # default 5 campaigns
//   CAMPAIGNS=3 node scripts/seed-tavern.mjs
//
// Env (.env):
//   ALICE_KEY            owner/admin/funder private key (Datum Alice)
//   ADVERTISER_KEY       advertiser private key (Datum Bob — already staked)
//   TAVERN_PUBLISHER_KEY new tavern publisher EOA key (omit → one is generated)
//   DIANA_ADDR           relaySigner delegate (default: live relay's Diana addr)
//   DATUM_ADDRESSES      path to deployed-addresses.json
//   TESTNET_RPC          Paseo eth-rpc (default eth-rpc-testnet.polkadot.io)

import {
  JsonRpcProvider, Wallet, Interface,
  decodeBase58, getBytes, hexlify, parseEther, formatEther, ZeroAddress,
} from "ethers";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ── env / config ─────────────────────────────────────────────────────────────
loadDotEnv(resolve(ROOT, ".env"));

const RPC = process.env.TESTNET_RPC || "https://eth-rpc-testnet.polkadot.io/";
const ADDR_PATH = process.env.DATUM_ADDRESSES
  || resolve(ROOT, "../datum/alpha-core/deployed-addresses.json");
const DIANA = process.env.DIANA_ADDR || "0xcA5668fB864Acab0aC7f4CFa73949174720b58D0";
// Action-verifier address for type-2 (sponsored-action) pots. Must equal the
// address of the relay's ACTION_VERIFIER_KEY. address(0) → action pot is funded
// but not claimable (no verifier to attest).
const ACTION_VERIFIER = process.env.ACTION_VERIFIER_ADDR || "0x0000000000000000000000000000000000000000";
const N = Number(process.env.CAMPAIGNS || 5);
const PUBLISHER_TAKE_BPS = Number(process.env.TAVERN_TAKE_BPS || 4000); // 40% to publisher
const GAS = { gasLimit: 900_000_000n, gasPrice: 1_000_000_000_000n, type: 0 };
const IPFS_GATEWAY = "https://ipfs-datum.javcon.io/ipfs/";

if (!existsSync(ADDR_PATH)) die(`deployed-addresses.json not found at ${ADDR_PATH}\n  set DATUM_ADDRESSES to the Datum repo's alpha-core/deployed-addresses.json`);
const A = JSON.parse(readFileSync(ADDR_PATH, "utf8"));

if (!process.env.ALICE_KEY)      die("ALICE_KEY not set (Datum Alice — owner/funder)");
if (!process.env.ADVERTISER_KEY) die("ADVERTISER_KEY not set (Datum Bob — staked advertiser)");

const p = new JsonRpcProvider(RPC);
const alice = new Wallet(process.env.ALICE_KEY, p);
const bob   = new Wallet(process.env.ADVERTISER_KEY, p);

// Tavern publisher: reuse the env key if given (idempotent re-runs), else mint
// a fresh one and surface it so the operator can persist it.
let publisherKey = process.env.TAVERN_PUBLISHER_KEY;
let generatedKey = false;
if (!publisherKey || !/^0x[0-9a-fA-F]{64}$/.test(publisherKey)) {
  publisherKey = Wallet.createRandom().privateKey;
  generatedKey = true;
}
const tavern = new Wallet(publisherKey, p);

// ── ABIs ─────────────────────────────────────────────────────────────────────
const iPub = new Interface([
  "function registerPublisher(uint16 takeRateBps)",
  "function setRelaySigner(address signer)",
  "function setProfile(bytes32 profileHash)",
  "function relaySigner(address) view returns (address)",
  "function getPublisher(address) view returns (tuple(address addr,uint256 takeRateBps,bool registered))",
]);
const iCamp = new Interface([
  "function nextCampaignId() view returns (uint256)",
  "function getCampaignStatus(uint256) view returns (uint8)",
  "function getCampaignPublisher(uint256) view returns (address)",
  "function getCampaignRelaySigner(uint256) view returns (address)",
  "function createCampaign(address publisher, tuple(uint8 actionType,uint256 budgetWei,uint256 dailyCapWei,uint256 rateWei,address actionVerifier)[] pots, bytes32[] requiredTags, bool requireZkProof, address rewardToken, uint256 rewardPerImpression, uint256 bondAmount) payable returns (uint256)",
]);
const iCreative = new Interface(["function setMetadata(uint256 campaignId, bytes32 metadataHash)"]);
const iRouter   = new Interface(["function adminActivateCampaign(uint256 campaignId)"]);

const STATUS = ["Pending", "Active", "Paused", "Completed", "Terminated", "Expired"];

// ── fantasy merchant campaign set ─────────────────────────────────────────────
const MERCHANTS = [
  { title: "Ironforge Smithy",       category: "Smithing",    c1: "#2b2018", c2: "#1a1410", accent: "#e8a13a", text: "Blades that bite back. Fresh-forged steel, fair prices, no curses (mostly).", cta: "Browse the Forge",  url: "https://en.wikipedia.org/wiki/Blacksmith" },
  { title: "Eastvale Caravan Co.",   category: "Safe Passage", c1: "#1d2a1e", c2: "#12180f", accent: "#9bcf5f", text: "Safe passage to the capital. Armed guards, soft cushions, hot stew at dusk.", cta: "Book Passage",      url: "https://en.wikipedia.org/wiki/Caravan_(travellers)" },
  { title: "Madame Hex's Apothecary", category: "Alchemy",    c1: "#241430", c2: "#150b1f", accent: "#c77dff", text: "Potions, philtres, and the occasional curse. Discretion absolutely guaranteed.", cta: "Peruse the Shelves", url: "https://en.wikipedia.org/wiki/Potion" },
  { title: "The Adventurers' Guild",  category: "Recruitment", c1: "#1a2330", c2: "#0e151f", accent: "#5fb0e8", text: "Now recruiting bold souls. Glory, gold, and dental. Bring your own sword.", cta: "Join the Guild",   url: "https://en.wikipedia.org/wiki/Adventure" },
  { title: "Gilded Tankard Brewery",  category: "Fine Ale",    c1: "#2e2410", c2: "#1c1608", accent: "#f0c14b", text: "Ale worth singing about, brewed under triple moons. First flagon's on the house.", cta: "Taste the Brew",  url: "https://en.wikipedia.org/wiki/Brewing" },
  { title: "Whispering Wand Emporium", category: "Arcana",     c1: "#102a2a", c2: "#081818", accent: "#43e0c0", text: "Wands, scrolls, and enchanted trinkets. We do not ask where you'll point them.", cta: "Inspect the Wares", url: "https://en.wikipedia.org/wiki/Magic_wand" },
];

function svgFor(m) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const words = m.text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 34) { lines.push(cur.trim()); cur = w; } else cur += " " + w;
    if (lines.length === 3) break;
  }
  if (cur.trim() && lines.length < 3) lines.push(cur.trim());
  const body = lines.map((l, i) => `<text x="22" y="${150 + i * 19}" font-size="12.5" fill="#f5e9d0" opacity="0.92">${esc(l)}</text>`).join("");
  const ctaW = Math.min(230, 30 + m.cta.length * 7.4);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="250" viewBox="0 0 300 250" font-family="Georgia, 'Times New Roman', serif">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${m.c1}"/><stop offset="100%" stop-color="${m.c2}"/></linearGradient></defs>
  <rect width="300" height="250" rx="10" fill="url(#bg)"/>
  <rect x="6" y="6" width="288" height="238" rx="8" fill="none" stroke="${m.accent}" stroke-width="1.5" opacity="0.55"/>
  <text x="22" y="44" font-size="11" fill="${m.accent}" opacity="0.85" letter-spacing="3">${esc(m.category.toUpperCase())}</text>
  <text x="21" y="96" font-size="26" font-weight="700" fill="#fff8ec">${esc(m.title)}</text>
  ${body}
  <rect x="22" y="208" width="${ctaW.toFixed(0)}" height="30" rx="6" fill="${m.accent}"/>
  <text x="${(22 + ctaW / 2).toFixed(0)}" y="227" font-size="12.5" font-weight="700" fill="#1a1208" text-anchor="middle">${esc(m.cta)} ↟</text>
  <text x="278" y="244" font-size="9" fill="#f5e9d0" opacity="0.5" text-anchor="end">sponsored · DATUM</text>
</svg>`;
}

// ── helpers (Paseo raw-provider patterns, from reseed-demo.mjs) ────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function withRetry(fn, label = "rpc", tries = 8) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) {
      last = e;
      const msg = String(e?.message ?? e);
      if (!/timeout|TIMEOUT|network|ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN|503|502|429|busy|rate|SERVER_ERROR/i.test(msg)) throw e;
      await sleep(1500 * (i + 1));
    }
  }
  throw last;
}
const txCount = (addr) => withRetry(() => p.getTransactionCount(addr), "nonce");

async function read(to, iface, fn, args) {
  const raw = await withRetry(() => p.call({ to, data: iface.encodeFunctionData(fn, args) }), `call ${fn}`);
  return iface.decodeFunctionResult(fn, raw);
}
async function send(signer, to, iface, fn, args, value = 0n) {
  const data = iface.encodeFunctionData(fn, args);
  const nonce = await txCount(signer.address);
  try { await signer.sendTransaction({ to, data, value, ...GAS, nonce }); } catch { /* verify via nonce */ }
  for (let i = 0; i < 90; i++) { if (await txCount(signer.address) > nonce) return; await sleep(2000); }
  throw new Error("nonce stuck: " + fn);
}
async function fund(to, amountWei, label) {
  const bal = await withRetry(() => p.getBalance(to), "bal");
  if (bal >= amountWei) { console.log(`  ${label} already funded (${formatEther(bal)} PAS)`); return; }
  const topUp = amountWei - bal;
  console.log(`  funding ${label} with ${formatEther(topUp)} PAS from Alice…`);
  const nonce = await txCount(alice.address);
  try { await alice.sendTransaction({ to, value: topUp, ...GAS, nonce }); } catch { /* verify via balance */ }
  for (let i = 0; i < 90; i++) { if (await withRetry(() => p.getBalance(to), "bal") >= amountWei) return; await sleep(2000); }
  throw new Error("funding stuck: " + label);
}

// ── IPFS (local Kubo node) ────────────────────────────────────────────────────
function ipfsAvailable() {
  const r = spawnSync("ipfs", ["--version"], { encoding: "utf8" });
  return r.status === 0;
}
function ipfsAdd(content) {
  const r = spawnSync("ipfs", ["add", "-Q", "--cid-version=0", "--pin=true"], { input: content, encoding: "utf8" });
  if (r.status !== 0) throw new Error("ipfs add failed: " + (r.stderr || r.error));
  return r.stdout.trim();
}
// CIDv0 ("Qm…") → bytes32 digest (strip 0x1220 prefix). Matches src/lib/ipfs.ts.
function cidToBytes32(cid) {
  const b = getBytes("0x" + decodeBase58(cid).toString(16).padStart(68, "0"));
  if (b.length !== 34 || b[0] !== 0x12 || b[1] !== 0x20) throw new Error("not CIDv0");
  return hexlify(b.slice(2));
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  const net = await withRetry(() => p.getNetwork(), "net");
  console.log(`seed-tavern → ${RPC} (chain ${net.chainId})`);
  console.log(`  addresses ← ${ADDR_PATH}`);
  console.log(`  campaigns=${A.campaigns}  creative=${A.campaignCreative}  publishers=${A.publishers}  router=${A.governanceRouter}`);
  console.log(`  advertiser Bob ${bob.address}`);
  console.log(`  tavern publisher ${tavern.address}${generatedKey ? "  (GENERATED — save the key below)" : ""}`);
  console.log(`  relaySigner delegate → Diana ${DIANA}\n`);

  if (!ipfsAvailable()) die("local `ipfs` (Kubo) CLI not found — needed to pin creatives to the gateway. Start the Datum IPFS node first.");

  // Per-campaign budgets (18-decimal wei — pallet-revive EVM scale).
  const POTS = [
    { actionType: 0, budgetWei: parseEther("0.6"), dailyCapWei: parseEther("0.6"), rateWei: parseEther("1"),    actionVerifier: ZeroAddress },     // view: 1 PAS CPM → 0.001/view
    { actionType: 1, budgetWei: parseEther("0.3"), dailyCapWei: parseEther("0.3"), rateWei: parseEther("0.01"), actionVerifier: ZeroAddress },     // click: 0.01 PAS/click
    { actionType: 2, budgetWei: parseEther("0.1"), dailyCapWei: parseEther("0.1"), rateWei: parseEther("0.05"), actionVerifier: ACTION_VERIFIER }, // action: 0.05 PAS/action
  ];
  if (ACTION_VERIFIER === ZeroAddress) {
    console.log("  [note] ACTION_VERIFIER_ADDR unset — action pots funded but not claimable");
  }
  const perCampaign = POTS.reduce((s, p) => s + p.budgetWei, 0n); // 1 PAS

  // ── [1] fund actors from Alice ────────────────────────────────────────────
  console.log("[1] funding actors from Alice…");
  await fund(tavern.address, parseEther("2"), "tavern publisher (gas)");
  // Bob needs budget for N campaigns + headroom for gas.
  await fund(bob.address, perCampaign * BigInt(N) + parseEther("5"), "advertiser Bob (budgets + gas)");

  // ── [2] register tavern publisher + delegate relaySigner → Diana ──────────
  console.log("\n[2] registering tavern publisher…");
  const pub = await read(A.publishers, iPub, "getPublisher", [tavern.address]);
  if (pub[0].registered) {
    console.log(`    already registered (take ${Number(pub[0].takeRateBps) / 100}%)`);
  } else {
    await send(tavern, A.publishers, iPub, "registerPublisher", [PUBLISHER_TAKE_BPS]);
    console.log(`    registered with take ${PUBLISHER_TAKE_BPS / 100}%`);
  }
  const curRelay = (await read(A.publishers, iPub, "relaySigner", [tavern.address]))[0];
  if (curRelay.toLowerCase() === DIANA.toLowerCase()) {
    console.log(`    relaySigner already → Diana`);
  } else {
    await send(tavern, A.publishers, iPub, "setRelaySigner", [DIANA]);
    const now = (await read(A.publishers, iPub, "relaySigner", [tavern.address]))[0];
    console.log(`    relaySigner → ${now}  ${now.toLowerCase() === DIANA.toLowerCase() ? "✓" : "✗ FAILED"}`);
  }

  // ── [3] create + fund + describe + activate campaigns ─────────────────────
  console.log(`\n[3] deploying ${N} fantasy-merchant campaigns (view+click+action pots)…`);
  const deployed = [];
  for (let i = 0; i < N; i++) {
    const m = MERCHANTS[i % MERCHANTS.length];
    const svgCid = ipfsAdd(svgFor(m));
    const cid = Number((await read(A.campaigns, iCamp, "nextCampaignId", []))[0]);
    await send(bob, A.campaigns, iCamp, "createCampaign",
      [tavern.address, POTS, [], false, ZeroAddress, 0n, 0n], perCampaign);

    const meta = {
      title: m.title, description: m.text, category: m.category, version: 1,
      creativeText: m.text, cta: m.cta, ctaUrl: m.url, imageUrl: svgCid,
      creative: { type: "text", text: m.text, cta: m.cta, ctaUrl: m.url, imageUrl: svgCid },
    };
    const metaCid = ipfsAdd(JSON.stringify(meta));
    await send(bob, A.campaignCreative, iCreative, "setMetadata", [cid, cidToBytes32(metaCid)]);
    await send(alice, A.governanceRouter, iRouter, "adminActivateCampaign", [cid]);

    const st = Number((await read(A.campaigns, iCamp, "getCampaignStatus", [cid]))[0]);
    const rs = (await read(A.campaigns, iCamp, "getCampaignRelaySigner", [cid]))[0];
    const okRelay = rs.toLowerCase() === DIANA.toLowerCase();
    deployed.push({ cid, title: m.title, category: m.category, svgCid, metaCid, status: STATUS[st], relaySigner: rs });
    console.log(`    #${cid} ${m.title.padEnd(24)} ${STATUS[st].padEnd(7)} relaySigner=${rs.slice(0, 8)}${okRelay ? "✓" : "✗"}  meta=${metaCid.slice(0, 12)}`);
  }

  // ── manifest + next-step hints ────────────────────────────────────────────
  const manifest = {
    at: new Date().toISOString(), chainId: Number(net.chainId), gateway: IPFS_GATEWAY,
    tavernPublisher: tavern.address, advertiser: bob.address, relaySigner: DIANA,
    campaigns: deployed,
  };
  writeFileSync(resolve(ROOT, "tavern-seed.json"), JSON.stringify(manifest, null, 2));

  console.log(`\n=== done: ${deployed.length} campaigns live for tavern publisher ${tavern.address} ===`);
  console.log(`manifest → tavern-seed.json`);
  if (deployed[0]) console.log(`sample creative: ${IPFS_GATEWAY}${deployed[0].metaCid}`);
  console.log(`\nNEXT:`);
  console.log(`  • set ADDRESSES.tavernPublisher in src/lib/addresses.ts to:`);
  console.log(`      ${tavern.address}`);
  if (generatedKey) {
    console.log(`  • SAVE this generated publisher key in .env for idempotent re-runs:`);
    console.log(`      TAVERN_PUBLISHER_KEY=${publisherKey}`);
  }
}

// ── tiny .env loader (avoid adding a dependency) ──────────────────────────────
function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}

function die(msg) { console.error("ERROR: " + msg); process.exit(1); }

main().catch((e) => { console.error(e); process.exit(1); });
