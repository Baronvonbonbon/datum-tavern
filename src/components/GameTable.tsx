/**
 * GameTable — floor hotspot.
 * Lets the user pick a game, play it solo (free RNG), or wager PAS on the result.
 */

import { useState } from "react";
import { Signer } from "ethers";
import { GameType } from "../lib/tavernBetting";
import { DiceRoll }     from "./games/DiceRoll";
import { ArmWrestling } from "./games/ArmWrestling";
import { DartBoard }    from "./games/DartBoard";
import { CardDraw }     from "./games/CardDraw";
import { HighLow }      from "./games/HighLow";
import { BettingModal } from "./BettingModal";

const GAMES = [
  { id: GameType.DICE,        label: "🎲 Dice Roll",     component: DiceRoll     },
  { id: GameType.ARM_WRESTLE, label: "💪 Arm Wrestling", component: ArmWrestling },
  { id: GameType.DARTS,       label: "🎯 Darts",         component: DartBoard    },
  { id: GameType.CARD_DRAW,   label: "🃏 Card Draw",     component: CardDraw     },
  { id: GameType.HIGH_CARD,   label: "⬆ High Card",     component: HighLow      },
  { id: GameType.LOW_CARD,    label: "⬇ Low Card",      component: HighLow      },
] as const;

interface Props {
  signer: Signer | null;
}

export function GameTable({ signer }: Props) {
  const [selected, setSelected] = useState<GameType | null>(null);
  const [betting,  setBetting]  = useState(false);

  const game = GAMES.find(g => g.id === selected);
  const GameComponent = game?.component ?? null;

  return (
    <div className="modal game-table">
      <h2 className="modal__title">🎲 Game Table</h2>

      {!selected && (
        <div className="game-table__grid">
          {GAMES.map(g => (
            <button
              key={g.id}
              className="game-table__tile"
              onClick={() => setSelected(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}

      {selected !== null && GameComponent && (
        <div className="game-table__play">
          <button className="btn btn--ghost game-table__back" onClick={() => { setSelected(null); setBetting(false); }}>
            ← Back
          </button>

          <GameComponent
            gameType={selected}
            // HighLow needs to know if it's high or low
            variant={selected === GameType.HIGH_CARD ? "high" : selected === GameType.LOW_CARD ? "low" : undefined}
          />

          <div className="game-table__wager">
            {signer ? (
              <button className="btn btn--primary" onClick={() => setBetting(true)}>
                💰 Place a Wager
              </button>
            ) : (
              <span className="hint">Connect wallet to wager PAS</span>
            )}
          </div>
        </div>
      )}

      {betting && selected !== null && (
        <BettingModal
          gameType={selected}
          signer={signer}
          onClose={() => setBetting(false)}
        />
      )}
    </div>
  );
}
