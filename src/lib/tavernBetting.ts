import { Contract, Signer } from "ethers";
import ABI from "../../abis/TavernBetting.json";
import { ADDRESSES } from "./addresses";

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
export const PLANCK_PER_PAS = 10n ** 10n;

/** Place a vs-house bet. Returns immediately after resolution. */
export async function betVsHouse(
  signer:   Signer,
  gameType: GameType,
  pasBet:   number,
): Promise<GameResult> {
  if (pasBet <= 0 || pasBet > MAX_BET_PAS) throw new Error("Bet out of range");
  const value = BigInt(pasBet) * PLANCK_PER_PAS;
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
  const value = BigInt(pasBet) * PLANCK_PER_PAS;
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
