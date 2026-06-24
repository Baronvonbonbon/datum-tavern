import { Contract, Signer, parseEther } from "ethers";
import ABI from "../../abis/TavernBetting.json";
import { ADDRESSES } from "./addresses";
import { getReadProvider } from "./pine";

export enum GameType {
  DICE        = 0,
  ARM_WRESTLE = 1,
  DARTS       = 2,
  CARD_DRAW   = 3,
  HIGH_CARD   = 4,
  LOW_CARD    = 5,
}

export interface GameResult {
  gameId:  bigint;
  winner:  string; // address(this) hex = house won
  payout:  bigint;
  p1Wins:  boolean;
}

function getContract(signer: Signer) {
  return new Contract(ADDRESSES.tavernBetting, ABI, signer);
}

export const MAX_BET_PAS = 1000;
// Paseo's pallet-revive EVM uses 18-decimal wei (parseEther), not 10^10 planck.
function pasToWei(pas: number): bigint {
  return parseEther(String(pas));
}

/** Place a vs-house bet. Returns immediately after resolution. */
export async function betVsHouse(
  signer:   Signer,
  gameType: GameType,
  pasBet:   number,
): Promise<GameResult> {
  if (pasBet <= 0 || pasBet > MAX_BET_PAS) throw new Error("Bet out of range");
  const value = pasToWei(pasBet);
  const c = getContract(signer);
  const tx = await c.createGame(gameType, true, { value });
  const receipt = await tx.wait();

  const iface = c.interface;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "GameResolved") {
        const [gameId, winner, payout] = parsed.args as unknown as [bigint, string, bigint];
        const signerAddr = (await signer.getAddress()).toLowerCase();
        return { gameId, winner, payout, p1Wins: winner.toLowerCase() === signerAddr };
      }
    } catch { /* not our event */ }
  }
  throw new Error("GameResolved event not found");
}

/** Open a P2P game. Returns the gameId for sharing. */
export async function openP2PGame(
  signer:   Signer,
  gameType: GameType,
  pasBet:   number,
): Promise<bigint> {
  const value = pasToWei(pasBet);
  const c = getContract(signer);
  const tx = await c.createGame(gameType, false, { value });
  const receipt = await tx.wait();

  const iface = c.interface;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "GameCreated") {
        return (parsed.args as unknown as [bigint])[0];
      }
    } catch { /* not our event */ }
  }
  throw new Error("GameCreated event not found");
}

/** Join an open P2P game. */
export async function joinP2PGame(signer: Signer, gameId: bigint): Promise<GameResult> {
  const c = getContract(signer);
  const game = await c.getGame(gameId);
  const tx = await c.joinGame(gameId, { value: game.betAmount });
  const receipt = await tx.wait();

  const iface = c.interface;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "GameResolved") {
        const [id, winner, payout] = parsed.args as unknown as [bigint, string, bigint];
        const signerAddr = (await signer.getAddress()).toLowerCase();
        return { gameId: id, winner, payout, p1Wins: winner.toLowerCase() === signerAddr };
      }
    } catch { /* not our event */ }
  }
  throw new Error("GameResolved event not found");
}

export async function getHouseBalance(signer: Signer): Promise<bigint> {
  const c = getContract(signer);
  return c.houseBalance();
}

// ── Read-only views (Console) ────────────────────────────────────────────────

function getReadContract() {
  return getReadProvider().then((p) => new Contract(ADDRESSES.tavernBetting, ABI, p));
}

export async function getGameCount(): Promise<bigint> {
  return (await getReadContract()).gameCount();
}

export async function getHouseBalanceRead(): Promise<bigint> {
  return (await getReadContract()).houseBalance();
}

export interface GameInfo {
  player1: string; player2: string; gameType: number;
  betAmount: bigint; state: number; createdAt: number; winner: string;
}

export async function getGame(id: bigint): Promise<GameInfo> {
  const g = await (await getReadContract()).getGame(id);
  return {
    player1: g.player1, player2: g.player2, gameType: Number(g.gameType),
    betAmount: g.betAmount, state: Number(g.state), createdAt: Number(g.createdAt), winner: g.winner,
  };
}

/** Cancel an open P2P game after its join timeout. Returns the tx hash. */
export async function cancelGame(signer: Signer, id: bigint): Promise<string> {
  const c = getContract(signer);
  const tx = await c.cancelGame(id);
  await tx.wait();
  return tx.hash;
}
