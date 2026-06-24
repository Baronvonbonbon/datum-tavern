import { Contract, Signer } from "ethers";
import { getReadProvider } from "./pine";
import { ADDRESSES, PASEO_TX } from "./addresses";
import ABI from "../../abis/TavernBoard.json";

export interface BoardMessage {
  id:       number;
  author:   string;
  text:     string;
  postedAt: number; // unix seconds
  onChain:  true;
}

function getContract(signerOrProvider: Signer | Awaited<ReturnType<typeof getReadProvider>>) {
  return new Contract(ADDRESSES.tavernBoard, ABI, signerOrProvider);
}

export async function fetchMessageCount(): Promise<number> {
  const provider = await getReadProvider();
  const c = getContract(provider);
  const n: bigint = await c.count();
  return Number(n);
}

/** Pull `n` random on-chain messages. Returns empty array if board is empty. */
export async function fetchRandomMessages(n: number): Promise<BoardMessage[]> {
  const total = await fetchMessageCount();
  if (total === 0) return [];

  const indices = new Set<number>();
  while (indices.size < Math.min(n, total)) {
    indices.add(Math.floor(Math.random() * total));
  }

  const provider = await getReadProvider();
  const c = getContract(provider);

  const results: BoardMessage[] = [];
  for (const idx of indices) {
    const [author, text, postedAt]: [string, string, bigint] = await c.getMessage(idx);
    results.push({ id: idx, author, text, postedAt: Number(postedAt), onChain: true });
  }
  return results;
}

/** Read a single message by index. */
export async function getMessage(id: number): Promise<BoardMessage> {
  const provider = await getReadProvider();
  const c = getContract(provider);
  const [author, text, postedAt]: [string, string, bigint] = await c.getMessage(id);
  return { id, author, text, postedAt: Number(postedAt), onChain: true };
}

/** Post a message on-chain. Requires a connected wallet signer. Returns the tx hash. */
export async function postMessage(signer: Signer, text: string): Promise<string> {
  const c = getContract(signer);
  const tx = await c.post(text, PASEO_TX);
  await tx.wait();
  return tx.hash;
}
