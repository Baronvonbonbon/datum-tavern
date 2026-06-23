import { useState } from "react";
import { GameType } from "../../lib/tavernBetting";

// Dartboard rings: [label, min score, max score, css class]
const RINGS = [
  { label: "Bullseye!",      score: 50, cls: "ring--bull"   },
  { label: "Outer Bull",     score: 25, cls: "ring--obull"  },
  { label: "Triple",         score: 18, cls: "ring--triple" },
  { label: "Double",         score: 12, cls: "ring--double" },
  { label: "Single",         score:  6, cls: "ring--single" },
  { label: "Miss (wire)",    score:  0, cls: "ring--miss"   },
];

interface Props { gameType: GameType; variant?: string }

export function DartBoard({ }: Props) {
  const [throws,  setThrows]  = useState<typeof RINGS[number][]>([]);
  const [aiming,  setAiming]  = useState(false);

  const throwDart = () => {
    if (throws.length >= 3) return;
    setAiming(true);
    setTimeout(() => {
      const roll = Math.random();
      let ring: typeof RINGS[number];
      if      (roll < 0.04) ring = RINGS[0]; // bullseye 4%
      else if (roll < 0.12) ring = RINGS[1]; // outer bull 8%
      else if (roll < 0.25) ring = RINGS[2]; // triple 13%
      else if (roll < 0.50) ring = RINGS[3]; // double 25%
      else if (roll < 0.80) ring = RINGS[4]; // single 30%
      else                  ring = RINGS[5]; // miss 20%
      setThrows(t => [...t, ring]);
      setAiming(false);
    }, 400);
  };

  const total = throws.reduce((acc, r) => acc + r.score, 0);
  const done  = throws.length >= 3;

  return (
    <div className="game dart-board">
      <div className="dart-board__board" aria-label="Dartboard">
        {RINGS.map((r, i) => (
          <div key={i} className={`dart-ring ${r.cls}`} />
        ))}
      </div>

      <div className="dart-board__throws">
        {throws.map((r, i) => (
          <span key={i} className={`dart-board__throw ${r.cls}`}>
            Dart {i + 1}: {r.label} (+{r.score})
          </span>
        ))}
      </div>

      {done && (
        <div className="game__result">
          <p className="game__outcome">Score: <strong>{total}</strong> / 150</p>
          <p>{total >= 100 ? "🎯 Expert throw! The crowd cheers." : total >= 50 ? "Decent showing." : "Might want to practice."}</p>
          <button className="btn btn--ghost" onClick={() => setThrows([])}>Play Again</button>
        </div>
      )}

      {!done && (
        <button className="btn btn--primary" onClick={throwDart} disabled={aiming}>
          {aiming ? "In flight…" : `Throw Dart ${throws.length + 1} / 3`}
        </button>
      )}
    </div>
  );
}
