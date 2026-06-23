import { PineProvider } from "pine-rpc";
import { BrowserProvider } from "ethers";
import { PINE_CHAIN } from "./addresses";

// Singleton Pine provider — initialises smoldot light client once. The
// connect() promise is cached so concurrent callers await the same sync and
// we never connect twice.
let _pine: PineProvider | null = null;
let _connecting: Promise<void> | null = null;

export async function getPineProvider(): Promise<PineProvider> {
  if (!_pine) {
    _pine = new PineProvider({ chain: PINE_CHAIN });
  }
  // connect() resolves once smoldot has synced to the finalized head.
  _connecting ??= _pine.connect();
  await _connecting;
  return _pine;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read path: trustless reads via the Pine smoldot light client.
//   PineProvider is an EIP-1193 provider, so it wraps in a BrowserProvider —
//   NOT a JsonRpcProvider (the old code passed the provider object where a URL
//   string is expected, which never worked).
//
// Write path: MetaMask. The injected wallet signs and submits every tx.
// ─────────────────────────────────────────────────────────────────────────────

let _readProvider: BrowserProvider | null = null;

/** Read-only ethers provider backed by the Pine light client (no wallet). */
export async function getReadProvider(): Promise<BrowserProvider> {
  if (!_readProvider) {
    const pine = await getPineProvider();
    _readProvider = new BrowserProvider(pine);
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
