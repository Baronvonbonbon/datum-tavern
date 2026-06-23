import { useState, useCallback } from "react";
import { BrowserProvider, Signer, formatEther } from "ethers";
import { getBrowserProvider } from "../lib/pine";
import { PASEO_CHAIN_ID } from "../lib/addresses";

export interface WalletState {
  address:    string | null;
  balance:    string | null; // formatted PAS
  signer:     Signer | null;
  connecting: boolean;
  error:      string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null, balance: null, signer: null, connecting: false, error: null,
  });

  const connect = useCallback(async () => {
    setState(s => ({ ...s, connecting: true, error: null }));
    try {
      // Prefer injected EIP-1193 provider (MetaMask, Talisman, Nova, Polkadot.js)
      if (!window.ethereum) throw new Error("No wallet extension found");

      const provider: BrowserProvider = await getBrowserProvider();
      await provider.send("eth_requestAccounts", []);

      const network = await provider.getNetwork();
      if (Number(network.chainId) !== PASEO_CHAIN_ID) {
        // Ask wallet to switch to Paseo Asset Hub
        await provider.send("wallet_switchEthereumChain", [
          { chainId: `0x${PASEO_CHAIN_ID.toString(16)}` },
        ]);
      }

      const signer  = await provider.getSigner();
      const address = await signer.getAddress();
      const raw     = await provider.getBalance(address);
      const balance = formatEther(raw);

      setState({ address, balance, signer, connecting: false, error: null });
    } catch (e: unknown) {
      setState(s => ({
        ...s,
        connecting: false,
        error: e instanceof Error ? e.message : "Connection failed",
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({ address: null, balance: null, signer: null, connecting: false, error: null });
  }, []);

  return { ...state, connect, disconnect };
}
