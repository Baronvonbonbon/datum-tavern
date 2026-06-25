import { WalletState } from "../hooks/useWallet";
import { EarningsState } from "../hooks/useEarnings";
import { EarningsPurse } from "./EarningsPurse";

interface Props {
  wallet: WalletState & { connect: () => void; disconnect: () => void };
  earnings: EarningsState | null;
  view: "tavern" | "console";
  onToggleView: () => void;
}

export function WalletBar({ wallet, earnings, view, onToggleView }: Props) {
  const short = wallet.address
    ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`
    : null;

  return (
    <div className="wallet-bar">
      <span className="wallet-bar__brand">⚔ DATUM TAVERN</span>
      <a
        className="wallet-bar__datum"
        href="https://datum.javcon.io"
        target="_blank"
        rel="noopener noreferrer"
        title="Datum Protocol"
      >
        datum.javcon.io ↗
      </a>
      <button className="btn btn--ghost wallet-bar__nav" onClick={onToggleView}>
        {view === "tavern" ? "⚙ Console" : "🍺 Tavern"}
      </button>

      {wallet.address ? (
        <div className="wallet-bar__info">
          {earnings && <EarningsPurse earnings={earnings} />}
          <span className="wallet-bar__address">{short}</span>
          <span className="wallet-bar__balance">{Number(wallet.balance).toFixed(2)} PAS</span>
          <button className="btn btn--ghost" onClick={wallet.disconnect}>Disconnect</button>
        </div>
      ) : (
        <button
          className="btn btn--primary"
          onClick={wallet.connect}
          disabled={wallet.connecting}
        >
          {wallet.connecting ? "Connecting…" : "Connect Wallet"}
        </button>
      )}

      {wallet.error && <span className="wallet-bar__error">{wallet.error}</span>}
    </div>
  );
}
