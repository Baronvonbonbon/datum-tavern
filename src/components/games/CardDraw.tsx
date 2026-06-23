import { useState } from "react";
import { GameType } from "../../lib/tavernBetting";

const SUITS  = ["♠","♥","♦","♣"] as const;
const VALUES = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"] as const;

type Suit  = typeof SUITS[number];
type Value = typeof VALUES[number];

interface Card { suit: Suit; value: Value; }

function randomCard(): Card {
  return {
    suit:  SUITS[Math.floor(Math.random() * 4)],
    value: VALUES[Math.floor(Math.random() * 13)],
  };
}

function numericValue(v: Value): number {
  if (v === "A")  return 14;
  if (v === "K")  return 13;
  if (v === "Q")  return 12;
  if (v === "J")  return 11;
  return parseInt(v, 10);
}

const FORTUNES: Record<string, string> = {
  "A♠": "The Ace of Spades. Death comes for us all. But not today.",
  "K♥": "The King of Hearts — the suicide king. A great sacrifice awaits.",
  "J♣": "The Knave of Clubs. Mischief and fortune travel together.",
  "Q♦": "The Diamond Queen. Wealth is near — if you reach for it.",
};

interface Props { gameType: GameType; variant?: string }

export function CardDraw({ }: Props) {
  const [playerCard, setPlayerCard] = useState<Card | null>(null);
  const [houseCard,  setHouseCard]  = useState<Card | null>(null);
  const [drawing,    setDrawing]    = useState(false);

  const draw = () => {
    setDrawing(true);
    setTimeout(() => {
      setPlayerCard(randomCard());
      setHouseCard(randomCard());
      setDrawing(false);
    }, 500);
  };

  const playerScore = playerCard ? numericValue(playerCard.value) : 0;
  const houseScore  = houseCard  ? numericValue(houseCard.value)  : 0;
  const won = playerScore > houseScore;
  const tie = playerScore === houseScore;

  const fortune = playerCard
    ? FORTUNES[`${playerCard.value}${playerCard.suit}`] ?? null
    : null;

  return (
    <div className="game card-draw">
      <div className="card-draw__table">
        <div className="card-draw__slot">
          <span className="card-draw__label">Your Card</span>
          <div className={`playing-card ${playerCard ? `suit-${playerCard.suit === "♥" || playerCard.suit === "♦" ? "red" : "black"}` : "card-back"}`}>
            {playerCard ? `${playerCard.value}${playerCard.suit}` : "🂠"}
          </div>
        </div>

        <span className="card-draw__vs">vs</span>

        <div className="card-draw__slot">
          <span className="card-draw__label">House Card</span>
          <div className={`playing-card ${houseCard ? `suit-${houseCard.suit === "♥" || houseCard.suit === "♦" ? "red" : "black"}` : "card-back"}`}>
            {houseCard ? `${houseCard.value}${houseCard.suit}` : "🂠"}
          </div>
        </div>
      </div>

      {playerCard && houseCard && !drawing && (
        <div className={`game__result game__result--${tie ? "tie" : won ? "win" : "lose"}`}>
          <p className="game__outcome">
            {tie ? "🤝 Draw!" : won ? "🏆 High card wins!" : "💀 House takes it."}
          </p>
          {fortune && <p className="card-draw__fortune">"{fortune}"</p>}
          <button className="btn btn--ghost" onClick={() => { setPlayerCard(null); setHouseCard(null); }}>
            Draw Again
          </button>
        </div>
      )}

      {!playerCard && (
        <button className="btn btn--primary" onClick={draw} disabled={drawing}>
          {drawing ? "Shuffling…" : "Draw a Card"}
        </button>
      )}
    </div>
  );
}
