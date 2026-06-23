import { TavernScene } from "./components/TavernScene";
import { WalletBar }   from "./components/WalletBar";
import { useWallet }   from "./hooks/useWallet";

export default function App() {
  const wallet = useWallet();

  return (
    <div className="app">
      <TavernScene signer={wallet.signer} />
      <WalletBar wallet={wallet} />
    </div>
  );
}
