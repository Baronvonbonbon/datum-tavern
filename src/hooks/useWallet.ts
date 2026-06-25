import { useState, useCallback } from "react";
import { BrowserProvider, Signer, formatEther } from "ethers";
import { getBrowserProvider } from "../lib/pine";
import { PASEO_CHAIN_ID, PASEO_RPC_URL, PASEO_RPC_WSS, PASEO_EXPLORER } from "../lib/addresses";

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
        const hexChainId = `0x${PASEO_CHAIN_ID.toString(16)}`;
        try {
          // Try to switch first…
          await provider.send("wallet_switchEthereumChain", [{ chainId: hexChainId }]);
        } catch {
          // …the wallet doesn't have Paseo yet (MetaMask 4902 / Nova "not found").
          // Add it (this also switches), then we're on-chain.
          await provider.send("wallet_addEthereumChain", [{
            chainId: hexChainId,
            chainName: "Paseo Asset Hub",
            nativeCurrency: { name: "Paseo", symbol: "PAS", decimals: 18 },
            // https first (MetaMask), wss too (Nova / Substrate-native wallets).
            rpcUrls: [PASEO_RPC_URL, PASEO_RPC_WSS],
            blockExplorerUrls: [PASEO_EXPLORER],
          }]);
        }
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
