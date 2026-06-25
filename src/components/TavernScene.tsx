/**
 * TavernScene — the main pixel-art tavern layout.
 *
 * Hotspot zones are absolutely positioned over a CSS-drawn background.
 * Clicking a zone opens the corresponding modal. One modal open at a time.
 */

import { useState } from "react";
import { Signer } from "ethers";
import { QuestBoard }    from "./QuestBoard";
import { Barkeep }       from "./Barkeep";
import { MerchantStall } from "./MerchantStall";
import { GameTable }     from "./GameTable";
import { WhatsThis }     from "./WhatsThis";

type Zone = "board" | "barkeep" | "merchant" | "games" | "about" | null;

interface Props {
  signer: Signer | null;
  onActivity?: () => void; // refresh wallet balance after a fund-moving action (bet)
}

export function TavernScene({ signer, onActivity }: Props) {
  const [activeZone, setActiveZone] = useState<Zone>(null);

  const open  = (z: Zone) => setActiveZone(z);
  const close  = () => setActiveZone(null);

  return (
    <div className="tavern-scene">
      {/* ── "What's all this?" explainer trigger (always visible) ── */}
      <button className="whats-this-btn" onClick={() => open("about")}>
        ❓ What's all this?
      </button>

      {/* ── Background layers ── */}
      <div className="tavern-bg">
        <div className="tavern-bg__floor" />
        <div className="tavern-bg__wall" />
        <div className="tavern-bg__beams" />
        <div className="tavern-bg__candle tavern-bg__candle--left"  />
        <div className="tavern-bg__candle tavern-bg__candle--right" />
        <div className="tavern-bg__fire" />
      </div>

      {/* ── Hotspot: Quest Board ── */}
      <button
        className="hotspot hotspot--board"
        onClick={() => open("board")}
        aria-label="Quest Board"
      >
        <span className="hotspot__label">📜 Quest Board</span>
      </button>

      {/* ── Hotspot: Barkeep ── */}
      <button
        className="hotspot hotspot--barkeep"
        onClick={() => open("barkeep")}
        aria-label="Talk to Barkeep"
      >
        <span className="hotspot__label">🍺 Barkeep</span>
      </button>

      {/* ── Hotspot: Merchant Stall ── */}
      <button
        className="hotspot hotspot--merchant"
        onClick={() => open("merchant")}
        aria-label="Merchant Stall"
      >
        <span className="hotspot__label">📯 Town Crier</span>
      </button>

      {/* ── Hotspot: Game Table ── */}
      <button
        className="hotspot hotspot--games"
        onClick={() => open("games")}
        aria-label="Game Table"
      >
        <span className="hotspot__label">🎲 Game Table</span>
      </button>

      {/* ── Modal overlay ── */}
      {activeZone && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal-wrap" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={close}>✕</button>
            {activeZone === "board"    && <QuestBoard    signer={signer} />}
            {activeZone === "barkeep"  && <Barkeep />}
            {activeZone === "merchant" && <MerchantStall />}
            {activeZone === "games"    && <GameTable     signer={signer} onActivity={onActivity} />}
            {activeZone === "about"    && <WhatsThis />}
          </div>
        </div>
      )}
    </div>
  );
}
