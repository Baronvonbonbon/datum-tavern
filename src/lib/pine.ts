import { BrowserProvider, JsonRpcProvider } from "ethers";
import { PASEO_RPC_URL, PASEO_CHAIN_ID } from "./addresses";

// ─────────────────────────────────────────────────────────────────────────────
// Read path: a plain JSON-RPC provider against Paseo's public eth-rpc. The
// gateway sends permissive CORS headers, so browser reads work directly — fast,
// reliable, and with no smoldot/WASM to load (important on static hosting like
// GitHub Pages). (Earlier this used the Pine smoldot light client; dropped for
// the hosted demo.)
//
// Write path: MetaMask. The injected wallet signs and submits every tx.
// ─────────────────────────────────────────────────────────────────────────────

let _readProvider: JsonRpcProvider | null = null;

/** Read-only ethers provider (public Paseo RPC, no wallet needed). */
export async function getReadProvider(): Promise<JsonRpcProvider> {
  if (!_readProvider) {
    _readProvider = new JsonRpcProvider(PASEO_RPC_URL, PASEO_CHAIN_ID, { staticNetwork: true });
  }
  return _readProvider;
}

/**
 * Signer-capable provider wrapping the injected MetaMask wallet.
 * MetaMask is the signing + submission layer for all transactions.
 */
export async function getBrowserProvider(): Promise<BrowserProvider> {
  if (!window.ethereum) throw new Error("No wallet extension found (MetaMask required)");
  return new BrowserProvider(window.ethereum);
}
