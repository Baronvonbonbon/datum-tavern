import { WalletState } from "../hooks/useWallet";

interface Props {
  wallet: WalletState & { connect: () => void; disconnect: () => void };
}

export function WalletBar({ wallet }: Props) {
  const short = wallet.address
    ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`
    : null;

  return (
    <div className="wallet-bar">
      <span className="wallet-bar__brand">⚔ DATUM TAVERN</span>

      {wallet.address ? (
        <div className="wallet-bar__info">
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
