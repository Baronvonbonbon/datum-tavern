import { useState } from "react";
import { GameType } from "../../lib/tavernBetting";
import { DieFace } from "../sprites/DieFace";

const FLAVOR: Record<number, string> = {
  1:  "Cursed roll. The tavern groans.",
  2:  "A low showing. Try again, adventurer.",
  3:  "Middling luck. Neither cursed nor blessed.",
  4:  "Not bad. Fortune winks.",
  5:  "Strong roll! The crowd murmurs approval.",
  6:  "NATURAL SIX! The gods smile upon thee!",
};

interface Props { gameType: GameType; variant?: string }

export function DiceRoll({ }: Props) {
  const [die1, setDie1] = useState<number | null>(null);
  const [die2, setDie2] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);

  const roll = () => {
    setRolling(true);
    // Animate for 600ms then settle
    let ticks = 0;
    const interval = setInterval(() => {
      setDie1(Math.floor(Math.random() * 6) + 1);
      setDie2(Math.floor(Math.random() * 6) + 1);
      if (++ticks >= 8) {
        clearInterval(interval);
        setRolling(false);
      }
    }, 75);
  };

  const total = die1 !== null && die2 !== null ? die1 + die2 : null;

  return (
    <div className="game dice-roll">
      <div className="dice-roll__dice">
        <span className={`die ${rolling ? "die--rolling" : ""}`}>
          <DieFace value={die1 ?? 1} size={56} />
        </span>
        <span className={`die ${rolling ? "die--rolling" : ""}`}>
          <DieFace value={die2 ?? 1} size={56} />
        </span>
      </div>

      {total !== null && !rolling && (
        <div className="dice-roll__result">
          <span className="dice-roll__total">Total: {total}</span>
          <p className="dice-roll__flavor">{FLAVOR[Math.max(die1!, die2!)]}</p>
        </div>
      )}

      <button className="btn btn--primary" onClick={roll} disabled={rolling}>
        {rolling ? "Rolling…" : die1 === null ? "Roll the Dice" : "Roll Again"}
      </button>
    </div>
  );
}
