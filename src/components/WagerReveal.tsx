/**
 * WagerReveal — animates the *on-chain* bet outcome as the chosen game.
 *
 * The win/loss comes straight from TavernBetting._resolve (a 50/50 on-chain RNG,
 * surfaced via the GameResolved event as `p1Wins`). This renders a player-vs-
 * opponent contest themed to the game whose result is consistent with that bit —
 * so the dice/cards you see ARE the chain's decision, not a separate animation.
 */

import { useState, useEffect } from "react";
import { formatEther } from "ethers";
import { GameType } from "../lib/tavernBetting";

const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const CARD_RANK: Record<number, string> = {
  2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10",
  11: "J", 12: "Q", 13: "K", 14: "A",
};

type Kind = "dice" | "card" | "num";
interface Theme { icon: string; min: number; max: number; kind: Kind; lowerWins?: boolean }

const THEMES: Record<GameType, Theme> = {
  [GameType.DICE]:        { icon: "🎲", min: 2, max: 12, kind: "dice" },
  [GameType.ARM_WRESTLE]: { icon: "💪", min: 1, max: 20, kind: "num" },
  [GameType.DARTS]:       { icon: "🎯", min: 1, max: 60, kind: "num" },
  [GameType.CARD_DRAW]:   { icon: "🃏", min: 2, max: 14, kind: "card" },
  [GameType.HIGH_CARD]:   { icon: "⬆", min: 2, max: 14, kind: "card" },
  [GameType.LOW_CARD]:    { icon: "⬇", min: 2, max: 14, kind: "card", lowerWins: true },
};

const pick = (lo: number, hi: number) => Math.floor(Math.random() * (hi - lo + 1)) + lo;

/** Two distinct values whose winner (higher, or lower for LOW_CARD) matches p1Wins. */
function buildPair(t: Theme, p1Wins: boolean): { player: number; opp: number } {
  let a = pick(t.min, t.max), b = pick(t.min, t.max);
  while (a === b) b = pick(t.min, t.max);
  const hi = Math.max(a, b), lo = Math.min(a, b);
  const playerTakesHigh = t.lowerWins ? !p1Wins : p1Wins;
  return playerTakesHigh ? { player: hi, opp: lo } : { player: lo, opp: hi };
}

function Value({ t, v }: { t: Theme; v: number }) {
  if (t.kind === "dice") {
    const lo = Math.max(1, v - 6), d1 = pick(lo, Math.min(6, v - 1)), d2 = v - d1;
    return <span className="wager-reveal__val">{DICE_FACES[d1 - 1]}{DICE_FACES[d2 - 1]}<small>{v}</small></span>;
  }
  if (t.kind === "card") return <span className="wager-reveal__val">{t.icon} {CARD_RANK[v]}</span>;
  return <span className="wager-reveal__val">{t.icon} {v}</span>;
}

interface Props {
  gameType: GameType;
  p1Wins: boolean;
  payoutWei: bigint;
  betPas: number;
  vsHouse: boolean;
  onClose: () => void;
}

export function WagerReveal({ gameType, p1Wins, payoutWei, betPas, vsHouse, onClose }: Props) {
  const t = THEMES[gameType];
  const [spinning, setSpinning] = useState(true);
  const [pair, setPair] = useState<{ player: number; opp: number }>({ player: t.min, opp: t.min });
  const opponent = vsHouse ? "House" : "Opponent";

  useEffect(() => {
    // Spin both sides on random values, then settle on the on-chain outcome.
    const iv = setInterval(() => setPair({ player: pick(t.min, t.max), opp: pick(t.min, t.max) }), 90);
    const done = setTimeout(() => { clearInterval(iv); setPair(buildPair(t, p1Wins)); setSpinning(false); }, 950);
    return () => { clearInterval(iv); clearTimeout(done); };
  }, [gameType, p1Wins]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`wager-reveal ${!spinning ? (p1Wins ? "win" : "lose") : ""}`}>
      <div className="wager-reveal__contest">
        <div className="wager-reveal__side">
          <span className="wager-reveal__who">You</span>
          <span className={spinning ? "wager-reveal__spin" : ""}><Value t={t} v={pair.player} /></span>
        </div>
        <span className="wager-reveal__vs">vs</span>
        <div className="wager-reveal__side">
          <span className="wager-reveal__who">{opponent}</span>
          <span className={spinning ? "wager-reveal__spin" : ""}><Value t={t} v={pair.opp} /></span>
        </div>
      </div>

      {spinning ? (
        <p className="wager-reveal__rolling">🎲 The chain rolls…</p>
      ) : (
        <div className="wager-reveal__outcome">
          {p1Wins ? (
            <>
              <p className="wager-reveal__verdict">🏆 YOU WIN!</p>
              <p>Payout: {formatEther(payoutWei)} PAS (staked {betPas})</p>
            </>
          ) : (
            <>
              <p className="wager-reveal__verdict">💀 {opponent} wins.</p>
              <p>You lost {betPas} PAS.</p>
            </>
          )}
          <p className="hint">Decided on-chain by TavernBetting — the dice above are that result.</p>
          <button className="btn btn--secondary" onClick={onClose}>Close</button>
        </div>
      )}
    </div>
  );
}
