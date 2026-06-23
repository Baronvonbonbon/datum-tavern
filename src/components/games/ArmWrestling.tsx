import { useState } from "react";
import { GameType } from "../../lib/tavernBetting";

const OPPONENTS = ["Gorm the Immovable", "One-Armed Pete", "Tiny Helga", "Blackthumb the Smith"];

const OUTCOMES_WIN  = ["You slam their hand down! The table splinters.", "Victory! Your opponent weeps openly.", "A clean win. Coins slide across the bar."];
const OUTCOMES_LOSE = ["Their grip is iron. You never stood a chance.", "Your wrist makes a sound. The crowd winces.", "You held on for three seconds. That's something."];

interface Props { gameType: GameType; variant?: string }

export function ArmWrestling({ }: Props) {
  const [opponent]  = useState(() => OPPONENTS[Math.floor(Math.random() * OPPONENTS.length)]);
  const [result,    setResult]    = useState<"win" | "lose" | null>(null);
  const [flavor,    setFlavor]    = useState("");
  const [power,     setPower]     = useState(0); // 0–100 mash-click power
  const [mashing,   setMashing]   = useState(false);

  const startMash = () => {
    setMashing(true);
    setPower(0);
    setResult(null);
  };

  const mash = () => {
    if (!mashing) return;
    setPower(p => Math.min(100, p + Math.floor(Math.random() * 18) + 5));
  };

  const resolve = () => {
    if (!mashing) return;
    setMashing(false);
    const playerScore = power + Math.random() * 30;
    const houseScore  = 50    + Math.random() * 60;
    const won = playerScore >= houseScore;
    setResult(won ? "win" : "lose");
    const pool = won ? OUTCOMES_WIN : OUTCOMES_LOSE;
    setFlavor(pool[Math.floor(Math.random() * pool.length)]);
  };

  return (
    <div className="game arm-wrestling">
      <p className="game__opponent">Challenger: <strong>{opponent}</strong></p>

      {!mashing && !result && (
        <button className="btn btn--primary" onClick={startMash}>
          Grip the Table
        </button>
      )}

      {mashing && (
        <>
          <div className="arm-wrestling__bar">
            <div className="arm-wrestling__fill" style={{ width: `${power}%` }} />
          </div>
          <p className="hint">MASH the button! Then HOLD when ready!</p>
          <div className="arm-wrestling__btns">
            <button className="btn btn--primary" onClick={mash}>PUSH!</button>
            <button className="btn btn--secondary" onClick={resolve}>Hold!</button>
          </div>
        </>
      )}

      {result && (
        <div className={`game__result game__result--${result}`}>
          <p className="game__outcome">{result === "win" ? "🏆 VICTORY" : "💀 DEFEATED"}</p>
          <p>{flavor}</p>
          <button className="btn btn--ghost" onClick={startMash}>Rematch</button>
        </div>
      )}
    </div>
  );
}
