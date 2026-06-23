import { TavernScene } from "./components/TavernScene";
import { WalletBar }   from "./components/WalletBar";
import { useWallet }   from "./hooks/useWallet";
import { useEarnings } from "./hooks/useEarnings";
import { EarningsProvider } from "./hooks/earningsContext";

export default function App() {
  const wallet   = useWallet();
  const earnings = useEarnings(wallet.signer, wallet.address);

  return (
    <EarningsProvider value={earnings}>
      <div className="app">
        <TavernScene signer={wallet.signer} />
        <WalletBar wallet={wallet} earnings={wallet.address ? earnings : null} />
      </div>
    </EarningsProvider>
  );
}
