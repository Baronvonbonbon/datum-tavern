/**
 * QuestBoard — left-wall hotspot.
 *
 * Pulls messages from two sources:
 *   1. On-chain TavernBoard contract (random indices)
 *   2. Seeded mock messages (always available)
 *
 * Every AD_INTERVAL pulls, a Datum-sponsored notice is injected inline.
 * Sponsored notices are visually distinct (gold border, wax seal).
 */

import { useState, useCallback } from "react";
import { Signer } from "ethers";
import { fetchRandomMessages, postMessage, BoardMessage } from "../lib/tavernBoard";
import { pickRandomAd, shouldShowAd, DatumAd } from "../lib/datumContracts";
import { sampleMockMessages, MockMessage } from "../data/mockMessages";

type Entry = (BoardMessage | MockMessage) & { _ad?: DatumAd };

interface Props {
  signer: Signer | null;
}

export function QuestBoard({ signer }: Props) {
  const [entries, setEntries] = useState<Entry[]>(() => sampleMockMessages(6) as Entry[]);
  const [posting, setPosting] = useState(false);
  const [draft,   setDraft]   = useState("");
  const [loading, setLoading] = useState(false);

  const pullMessages = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch new on-chain messages (3 random)
      const onChain = await fetchRandomMessages(3);
      // Mix with mock messages to fill gaps
      const mock    = sampleMockMessages(3);
      const batch: Entry[] = [...onChain, ...mock].sort(() => Math.random() - 0.5);

      // Possibly inject a sponsored ad into the batch
      if (shouldShowAd()) {
        const ad = await pickRandomAd();
        if (ad) {
          // Insert ad at position 2 (non-intrusive)
          const sponsored: Entry = {
            id:      `ad-${ad.campaignId}`,
            author:  ad.advertiser,
            text:    ad.body || ad.title || ad.description || "A sponsored notice from a passing merchant.",
            onChain: false,
            _ad:     ad,
          } as unknown as Entry;
          batch.splice(2, 0, sponsored);
        }
      }

      setEntries(batch);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePost = useCallback(async () => {
    if (!signer || !draft.trim()) return;
    setPosting(true);
    try {
      await postMessage(signer, draft.trim());
      setDraft("");
      await pullMessages();
    } finally {
      setPosting(false);
    }
  }, [signer, draft, pullMessages]);

  return (
    <div className="modal quest-board">
      <h2 className="modal__title">📜 Quest Board</h2>

      <div className="quest-board__notices">
        {entries.map((e, i) => (
          <Notice key={(e as { id: string | number }).id ?? i} entry={e} />
        ))}
      </div>

      <div className="quest-board__actions">
        <button className="btn btn--secondary" onClick={pullMessages} disabled={loading}>
          {loading ? "Pulling…" : "Pull New Messages"}
        </button>

        {signer && (
          <div className="quest-board__post">
            <textarea
              className="input"
              maxLength={280}
              rows={2}
              placeholder="Leave a notice on the board… (on-chain)"
              value={draft}
              onChange={e => setDraft(e.target.value)}
            />
            <button className="btn btn--primary" onClick={handlePost} disabled={posting || !draft.trim()}>
              {posting ? "Posting…" : "Post Notice (sign)"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Notice({ entry }: { entry: Entry }) {
  const isAd      = "_ad" in entry && !!entry._ad;
  const isOnChain = "onChain" in entry && entry.onChain;

  return (
    <div className={`notice ${isAd ? "notice--sponsored" : ""} ${isOnChain ? "notice--onchain" : ""}`}>
      {isAd && <span className="notice__seal">🔱 Sponsored Quest</span>}
      <p className="notice__text">{(entry as { text: string }).text}</p>
      <span className="notice__author">
        — {(entry as { author: string }).author}
        {isOnChain && <span className="notice__chain-badge" title="On-chain">⛓</span>}
      </span>
    </div>
  );
}
