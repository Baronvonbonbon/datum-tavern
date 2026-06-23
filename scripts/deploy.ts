/**
 * deploy.ts — Deploy TavernBoard + TavernBetting to Paseo Asset Hub.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network paseo
 *
 * Env (in .env):
 *   DEPLOYER_PRIVATE_KEY   — deployer EOA private key
 *   HOUSE_FUND_PAS         — PAS to seed the house pot (default: 100)
 *
 * Outputs deployed-addresses.json in repo root on success.
 */

import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

const PLANCK_PER_PAS = 10n ** 10n;
const DENOM_ROUND    = 10n ** 6n; // Paseo denomination rounding requirement

function roundPlanck(raw: bigint): bigint {
  return (raw / DENOM_ROUND) * DENOM_ROUND;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const bal = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(bal), "PAS");

  // ── TavernBoard ───────────────────────────────────────────────────────────
  console.log("\nDeploying TavernBoard...");
  const BoardFactory = await ethers.getContractFactory("TavernBoard");
  const board = await BoardFactory.deploy();
  await board.waitForDeployment();
  const boardAddr = await board.getAddress();
  console.log("TavernBoard:", boardAddr);

  // ── TavernBetting ─────────────────────────────────────────────────────────
  console.log("\nDeploying TavernBetting...");
  const BettingFactory = await ethers.getContractFactory("TavernBetting");
  const betting = await BettingFactory.deploy();
  await betting.waitForDeployment();
  const bettingAddr = await betting.getAddress();
  console.log("TavernBetting:", bettingAddr);

  // ── Fund the house pot ────────────────────────────────────────────────────
  const housePas  = BigInt(process.env.HOUSE_FUND_PAS ?? "100");
  const houseFund = roundPlanck(housePas * PLANCK_PER_PAS);
  console.log(`\nFunding house pot with ${housePas} PAS...`);
  const fundTx = await deployer.sendTransaction({
    to:    bettingAddr,
    value: houseFund,
  });
  await fundTx.wait();
  console.log("House balance:", ethers.formatEther(await betting.houseBalance()), "PAS");

  // ── Write addresses ───────────────────────────────────────────────────────
  const out = {
    network:     "paseo",
    deployedAt:  new Date().toISOString(),
    deployer:    deployer.address,
    tavernBoard:   boardAddr,
    tavernBetting: bettingAddr,
  };

  const outPath = path.join(__dirname, "..", "deployed-addresses.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("\nAddresses written to deployed-addresses.json");
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
