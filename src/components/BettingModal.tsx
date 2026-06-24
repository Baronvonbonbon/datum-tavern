/**
 * BettingModal — wraps a specific game with bet controls.
 * Shown on top of a game component when the user chooses to wager.
 */

import { useState, useEffect } from "react";
import { Signer, formatEther } from "ethers";
import { betVsHouse, openP2PGame, getHouseBalanceRead, GameType, MAX_BET_PAS, GameResult } from "../lib/tavernBetting";
import { getReadProvider } from "../lib/pine";

const GAS_HEADROOM_PAS = 1; // ~1 PAS reserved for the tx fee on top of the stake

interface Props {
  gameType: GameType;
  signer:   Signer | null;
  onClose:  () => void;
}

type Mode = "vsHouse" | "p2p";

export function BettingModal({ gameType, signer, onClose }: Props) {
  const [mode,    setMode]    = useState<Mode>("vsHouse");
  const [bet,     setBet]     = useState(1);
  const [pending, setPending] = useState(false);
  const [result,  setResult]  = useState<GameResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [p2pId,   setP2pId]   = useState<bigint | null>(null);
  const [housePas, setHousePas] = useState<number | null>(null);
  const [walletPas, setWalletPas] = useState<number | null>(null);

  const gameName = GameType[gameType].replace("_", " ");

  // The house must cover 2× a vs-house bet, so cap vs-house bets at houseBalance/2.
  useEffect(() => { getHouseBalanceRead().then((b) => setHousePas(Number(formatEther(b)))).catch(() => {}); }, []);
  // The user's own wallet must cover the stake + gas — betting wagers real coin
  // (unlike the gasless earn/settle/cash-out paths).
  useEffect(() => {
    if (!signer) { setWalletPas(null); return; }
    (async () => {
      try { const p = await getReadProvider(); const a = await signer.getAddress(); setWalletPas(Number(formatEther(await p.getBalance(a)))); } catch { /* ignore */ }
    })();
  }, [signer]);

  const maxVsHouse = housePas != null ? Math.min(MAX_BET_PAS, Math.floor(housePas / 2)) : MAX_BET_PAS;
  const maxBet = mode === "vsHouse" ? maxVsHouse : MAX_BET_PAS;
  const betTooBig = bet > maxBet;
  const needPas = bet + GAS_HEADROOM_PAS;
  const insufficient = walletPas != null && walletPas < needPas;

  const handleBet = async () => {
    if (!signer || betTooBig || insufficient) return;
    setPending(true);
    setError(null);
    setResult(null);
    try {
      if (mode === "vsHouse") {
        const res = await betVsHouse(signer, gameType, bet);
        setResult(res);
      } else {
        const id = await openP2PGame(signer, gameType, bet);
        setP2pId(id);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="betting-modal">
      <h3 className="betting-modal__title">⚔ Wager on {gameName}</h3>

      {!result && !p2pId && (
        <>
          <div className="betting-modal__mode">
            <label>
              <input type="radio" checked={mode === "vsHouse"} onChange={() => setMode("vsHouse")} />
              {" "}vs House (instant)
            </label>
            <label>
              <input type="radio" checked={mode === "p2p"} onChange={() => setMode("p2p")} />
              {" "}P2P (open challenge)
            </label>
          </div>

          <div className="betting-modal__amount">
            <label>
              Bet (PAS):
              <input
                type="number"
                min={1}
                max={maxBet}
                value={bet}
                onChange={e => setBet(Number(e.target.value))}
              />
            </label>
            <span className="betting-modal__max">
              max {maxBet} PAS
              {mode === "vsHouse" && housePas != null && ` (house holds ${housePas.toFixed(0)})`}
            </span>
          </div>

          {!signer && <p className="betting-modal__warn">Connect a wallet to place bets.</p>}
          {betTooBig && <p className="betting-modal__error">Max {maxBet} PAS {mode === "vsHouse" ? "— the house can't cover a bigger vs-house wager." : "per bet."}</p>}
          {insufficient && (
            <p className="betting-modal__error">
              Need ~{needPas} PAS (stake + gas), but your wallet holds {walletPas?.toFixed(2)} PAS.
              Bets wager your own coin — fund your wallet from the Paseo faucet to play.
            </p>
          )}
          {error   && <p className="betting-modal__error">{error}</p>}

          <div className="betting-modal__actions">
            <button className="btn btn--primary" onClick={handleBet} disabled={pending || !signer || betTooBig || insufficient}>
              {pending ? "Signing…" : "Place Bet"}
            </button>
            <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
          </div>
        </>
      )}

      {result && (
        <div className={`betting-modal__result ${result.p1Wins ? "win" : "lose"}`}>
          <p className="betting-modal__outcome">
            {result.p1Wins ? "🏆 YOU WIN!" : "💀 The house wins."}
          </p>
          {result.p1Wins && (
            <p>Payout: {formatEther(result.payout)} PAS</p>
          )}
          <button className="btn btn--secondary" onClick={onClose}>Close</button>
        </div>
      )}

      {p2pId !== null && (
        <div className="betting-modal__p2p">
          <p>⚔ Game #{p2pId.toString()} is open.</p>
          <p className="hint">Share this game ID with an opponent. They can join with the same bet.</p>
          <button className="btn btn--secondary" onClick={onClose}>Done</button>
        </div>
      )}
    </div>
  );
}
