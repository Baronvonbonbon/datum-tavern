import { PineProvider } from "pine-rpc";
import { BrowserProvider, JsonRpcProvider } from "ethers";

// Singleton Pine provider — initialises smoldot light client once.
let _pine: PineProvider | null = null;

export async function getPineProvider(): Promise<PineProvider> {
  if (!_pine) {
    _pine = new PineProvider({ chain: "paseo-asset-hub" });
    await _pine.ready; // waits for smoldot to sync to finalized head
  }
  return _pine;
}

// Read-only ethers provider backed by Pine (no wallet needed).
export async function getReadProvider(): Promise<JsonRpcProvider> {
  const pine = await getPineProvider();
  return new JsonRpcProvider(pine as unknown as string, undefined, {
    staticNetwork: true,
  });
}

// Signer-capable provider wrapping a browser wallet (MetaMask / Talisman / Nova).
// The wallet is the signing layer; Pine handles reads.
export async function getBrowserProvider(): Promise<BrowserProvider> {
  const pine = await getPineProvider();
  return new BrowserProvider(pine);
}
