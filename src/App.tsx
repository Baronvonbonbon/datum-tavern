import { useState } from "react";
import { TavernScene } from "./components/TavernScene";
import { Console }     from "./components/Console";
import { WalletBar }   from "./components/WalletBar";
import { useWallet }   from "./hooks/useWallet";
import { useEarnings } from "./hooks/useEarnings";
import { EarningsProvider } from "./hooks/earningsContext";

type View = "tavern" | "console";

export default function App() {
  const wallet   = useWallet();
  const earnings = useEarnings(wallet.signer, wallet.address);
  const [view, setView] = useState<View>("tavern");

  return (
    <EarningsProvider value={earnings}>
      <div className="app">
        {view === "tavern"
          ? <TavernScene signer={wallet.signer} />
          : <Console signer={wallet.signer} address={wallet.address} />}
        <WalletBar
          wallet={wallet}
          earnings={wallet.address ? earnings : null}
          view={view}
          onToggleView={() => setView((v) => (v === "tavern" ? "console" : "tavern"))}
        />
      </div>
    </EarningsProvider>
  );
}
