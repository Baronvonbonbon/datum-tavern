/**
 * HighLow — used for both High Card and Low Card game modes.
 * A mystery card is drawn. Player guesses higher or lower than the revealed card.
 * 3 rounds; score tracked.
 */

import { useState } from "react";
import { GameType } from "../../lib/tavernBetting";

const VALUES = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"] as const;
type CardValue = typeof VALUES[number];

function numericValue(v: CardValue): number {
  if (v === "A")  return 13;
  if (v === "K")  return 12;
  if (v === "Q")  return 11;
  if (v === "J")  return 10;
  return parseInt(v, 10) - 2; // 2→0, 3→1, … 10→8
}

function randomCard(): CardValue {
  return VALUES[Math.floor(Math.random() * VALUES.length)];
}

interface Props {
  gameType: GameType;
  /** "high" = player needs higher card to win; "low" = lower card wins */
  variant?: string;
}

export function HighLow({ gameType, variant }: Props) {
  const mode: "high" | "low" = (variant === "low" || gameType === GameType.LOW_CARD) ? "low" : "high";

  const [current,  setCurrent]  = useState<CardValue | null>(null);
  const [next,     setNext]     = useState<CardValue | null>(null);
  const [round,    setRound]    = useState(0);
  const [score,    setScore]    = useState(0);
  const [history,  setHistory]  = useState<Array<{ current: CardValue; next: CardValue; correct: boolean }>>([]);
  const [guessed,  setGuessed]  = useState(false);
  const [done,     setDone]     = useState(false);

  const ROUNDS = 3;

  const start = () => {
    setCurrent(randomCard());
    setNext(null);
    setRound(1);
    setScore(0);
    setHistory([]);
    setGuessed(false);
    setDone(false);
  };

  const guess = (guessHigh: boolean) => {
    if (!current || guessed) return;
    const drawn = randomCard();
    setNext(drawn);

    const curVal  = numericValue(current);
    const nextVal = numericValue(drawn);

    const correct = mode === "high"
      ? (guessHigh ? nextVal >= curVal : nextVal <= curVal)
      : (guessHigh ? nextVal >= curVal : nextVal <= curVal);

    setHistory(h => [...h, { current, next: drawn, correct }]);
    if (correct) setScore(s => s + 1);
    setGuessed(true);

    setTimeout(() => {
      if (round >= ROUNDS) {
        setDone(true);
      } else {
        setCurrent(drawn);
        setNext(null);
        setRound(r => r + 1);
        setGuessed(false);
      }
    }, 900);
  };

  const modeLabel = mode === "high" ? "HIGHER" : "LOWER";

  return (
    <div className="game high-low">
      <p className="game__subtitle">
        {mode === "high" ? "⬆ High Card" : "⬇ Low Card"} — guess if the next card is {modeLabel}
      </p>

      {!current && !done && (
        <button className="btn btn--primary" onClick={start}>Deal Cards</button>
      )}

      {current && !done && (
        <>
          <div className="high-low__cards">
            <div className="playing-card playing-card--revealed">{current}</div>
            <div className="playing-card playing-card--hidden">?</div>
          </div>

          <p className="high-low__round">Round {round} / {ROUNDS} — Score: {score}</p>

          {!guessed && (
            <div className="high-low__btns">
              <button className="btn btn--primary" onClick={() => guess(true)}>⬆ Higher</button>
              <button className="btn btn--primary" onClick={() => guess(false)}>⬇ Lower</button>
            </div>
          )}

          {guessed && next && (
            <div className="high-low__reveal">
              <div className="playing-card">{next}</div>
              <p>{history.at(-1)?.correct ? "✅ Correct!" : "❌ Wrong!"}</p>
            </div>
          )}
        </>
      )}

      {done && (
        <div className="game__result">
          <p className="game__outcome">
            Final score: {score} / {ROUNDS}
          </p>
          <p>
            {score === ROUNDS ? "🏆 Perfect! The cards bend to your will."
              : score >= 2    ? "Good instincts."
              : score === 1   ? "The cards are capricious today."
              : "The deck was clearly stacked."}
          </p>
          <button className="btn btn--ghost" onClick={start}>Play Again</button>
        </div>
      )}
    </div>
  );
}

import { GameType as GT } from "../../lib/tavernBetting";
// Re-export alias so GameTable.tsx import stays clean
export { GT as GameType };
