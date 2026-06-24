// deploy-tavern.mjs — deploy TavernBoard + TavernBetting to Paseo, raw-provider
// style (Paseo's getTransactionReceipt is flaky), and fund the betting house.
//
//   node scripts/deploy-tavern.mjs
//
// Env (.env): ALICE_KEY (deployer/funder), HOUSE_FUND_PAS (default 50), TESTNET_RPC.
// Run `npx hardhat compile` first so artifacts/ has bytecode.

import { JsonRpcProvider, Wallet, ContractFactory, getCreateAddress, parseEther, formatEther } from "ethers";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadDotEnv(resolve(ROOT, ".env"));

const RPC = process.env.TESTNET_RPC || "https://eth-rpc-testnet.polkadot.io/";
const HOUSE_FUND = parseEther(process.env.HOUSE_FUND_PAS || "50");
const GAS = { gasLimit: 2_000_000_000n, gasPrice: 1_000_000_000_000n, type: 0 };
if (!process.env.ALICE_KEY) die("ALICE_KEY not set in .env (the deployer/funder)");

const p = new JsonRpcProvider(RPC);
const deployer = new Wallet(process.env.ALICE_KEY, p);

const artifact = (name) => {
  const path = resolve(ROOT, `artifacts/contracts/${name}.sol/${name}.json`);
  if (!existsSync(path)) die(`artifact missing: ${path} — run \`npx hardhat compile\``);
  return JSON.parse(readFileSync(path, "utf8"));
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = () => ({ ...GAS, gasPrice: GAS.gasPrice + BigInt(Math.floor(Math.random() * 1_000_000)) });

/** Deploy a no-arg contract; returns its address (Paseo-safe: nonce poll + getCreateAddress). */
async function deploy(name) {
  const art = artifact(name);
  const factory = new ContractFactory(art.abi, art.bytecode, deployer);
  const nonce = await p.getTransactionCount(deployer.address);
  const addr = getCreateAddress({ from: deployer.address, nonce });
  const tx = await factory.getDeployTransaction();
  try { await deployer.sendTransaction({ ...tx, ...jitter(), nonce }); } catch { /* verify via code */ }
  for (let i = 0; i < 120; i++) {
    await sleep(2000);
    if ((await p.getCode(addr).catch(() => "0x")) !== "0x") { console.log(`  ${name} → ${addr}`); return addr; }
  }
  throw new Error(`deploy stuck: ${name}`);
}

async function main() {
  const net = await p.getNetwork();
  console.log(`deploy-tavern → ${RPC} (chain ${net.chainId})`);
  console.log(`  deployer ${deployer.address} (${formatEther(await p.getBalance(deployer.address))} PAS)\n`);

  const tavernBoard = await deploy("TavernBoard");
  const tavernBetting = await deploy("TavernBetting");

  // Fund the betting house so vs-house wagers can pay out.
  console.log(`\n  funding house with ${formatEther(HOUSE_FUND)} PAS…`);
  const nonce = await p.getTransactionCount(deployer.address);
  try { await deployer.sendTransaction({ to: tavernBetting, value: HOUSE_FUND, ...jitter(), nonce }); } catch { /* verify */ }
  for (let i = 0; i < 60; i++) { await sleep(2000); if ((await p.getBalance(tavernBetting)) >= HOUSE_FUND) break; }
  console.log(`  house balance: ${formatEther(await p.getBalance(tavernBetting))} PAS`);

  const out = { network: "polkadotTestnet", deployedAt: new Date().toISOString(), deployer: deployer.address, tavernBoard, tavernBetting };
  writeFileSync(resolve(ROOT, "deployed-addresses.json"), JSON.stringify(out, null, 2));
  console.log(`\n=== done ===`);
  console.log(`paste into src/lib/addresses.ts:`);
  console.log(`  tavernBoard:   "${tavernBoard}",`);
  console.log(`  tavernBetting: "${tavernBetting}",`);
}

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
}
function die(m) { console.error("ERROR: " + m); process.exit(1); }

main().catch((e) => { console.error(e); process.exit(1); });
