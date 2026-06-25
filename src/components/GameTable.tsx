/**
 * GameTable — floor hotspot.
 * Pick a game, then either play it solo for fun (free local RNG, no stakes) or
 * wager PAS. A wager resolves on-chain (TavernBetting, a 50/50 RNG) and the
 * outcome is revealed AS the game (see WagerReveal) — the dice/cards you see are
 * the chain's actual result, not a separate animation.
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
import { useDatumCampaigns } from "../hooks/useDatumCampaigns";
import { useEarningsContext } from "../hooks/earningsContext";
import { ACTION_TYPE } from "../lib/addresses";
import { OnChainNote } from "./OnChainNote";

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
  onActivity?: () => void; // bubbled up so the wallet bar refreshes after a wager
}

export function GameTable({ signer, onActivity }: Props) {
  const [selected, setSelected] = useState<GameType | null>(null);
  const [betting,  setBetting]  = useState(false);
  const { ads } = useDatumCampaigns();
  const earnings = useEarningsContext();

  const game = GAMES.find(g => g.id === selected);
  const GameComponent = game?.component ?? null;

  // This round is "sponsored by" the first active campaign; completing the
  // sponsored action settles a type-2 action claim (relay verifier attests).
  const sponsor = ads[0] ?? null;

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
          <p className="hint game-table__free-note">↑ Free practice (local RNG, no stakes).</p>

          <div className="game-table__wager">
            {signer ? (
              <button className="btn btn--primary" onClick={() => setBetting(true)}>
                💰 Wager PAS (on-chain)
              </button>
            ) : (
              <span className="hint">Connect wallet to wager PAS</span>
            )}
          </div>

          {/* ── sponsored action: earn a Datum action reward ── */}
          {earnings && sponsor && (
            <div className="game-table__sponsor">
              <span className="game-table__sponsor-tag">
                ⚔ This round sponsored by {sponsor.title || `Campaign #${sponsor.campaignId}`}
              </span>
              <button
                className="btn btn--secondary"
                disabled={earnings.busy}
                onClick={() => void earnings.claim(sponsor.campaignId, ACTION_TYPE.ACTION, 1n)}
              >
                {earnings.busy ? "Claiming…" : "🎁 Complete sponsored action"}
              </button>
              {earnings.status && <span className="game-table__sponsor-status">{earnings.status}</span>}
            </div>
          )}
        </div>
      )}

      {betting && selected !== null && (
        <BettingModal
          gameType={selected}
          signer={signer}
          onResolved={onActivity}
          onClose={() => setBetting(false)}
        />
      )}

      <OnChainNote>
        Two separate economies. <b>Wagers</b> use your own PAS via
        <code>TavernBetting</code> (independent of Datum): a 50/50 result from
        <code>keccak256(blockhash…)</code>, resolved on-chain the moment you sign —
        and the dice/cards revealed are derived from that exact outcome. A
        <b> sponsored action</b> settles a Datum action-claim — the relay's
        verifier attests it (<code>/action-attest</code>) and your reward lands in
        <code>PaymentVault</code>. Gameplay and ads stay cleanly separated.
      </OnChainNote>
    </div>
  );
}
