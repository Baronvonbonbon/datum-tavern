/**
 * MerchantStall — right-wall hotspot.
 * Dedicated sponsored content crier. Always shows Datum campaign creatives.
 * Cycles through all active ads for this publisher.
 */

import { useState, useEffect } from "react";
import { fetchTavernAds, DatumAd } from "../lib/datumContracts";

export function MerchantStall() {
  const [ads,     setAds]     = useState<DatumAd[]>([]);
  const [idx,     setIdx]     = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTavernAds()
      .then(setAds)
      .catch(() => setAds([]))
      .finally(() => setLoading(false));
  }, []);

  const current = ads[idx] ?? null;

  const next = () => setIdx(i => (i + 1) % Math.max(1, ads.length));
  const prev = () => setIdx(i => (i - 1 + Math.max(1, ads.length)) % Math.max(1, ads.length));

  return (
    <div className="modal merchant-stall">
      <h2 className="modal__title">📯 The Town Crier</h2>
      <p className="merchant-stall__subtitle">Sponsored announcements — posted by verified advertisers</p>

      {loading && <p className="loading-text">Consulting the ledger…</p>}

      {!loading && ads.length === 0 && (
        <div className="merchant-stall__empty">
          <p>The crier has no announcements today.</p>
          <p className="hint">Advertise here by creating a campaign on the Datum Protocol.</p>
        </div>
      )}

      {!loading && current && (
        <div className="merchant-stall__ad">
          {current.imageUrl && (
            <div className="merchant-stall__creative">
              <img
                src={current.imageUrl}
                alt={current.title || "Sponsored creative"}
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}

          {current.title && <h3 className="merchant-stall__headline">{current.title}</h3>}
          {current.body && <p className="merchant-stall__body">{current.body}</p>}
          {current.cta && current.ctaUrl && (
            <a className="btn btn--primary" href={current.ctaUrl} target="_blank" rel="noopener noreferrer">
              {current.cta}
            </a>
          )}

          <div className="merchant-stall__meta">
            <span className="merchant-stall__advertiser">
              Posted by: {current.advertiser.slice(0, 10)}…
            </span>
            <span className="merchant-stall__campaign">
              Campaign #{current.campaignId.toString()}
            </span>
          </div>

          {ads.length > 1 && (
            <div className="merchant-stall__nav">
              <button className="btn btn--ghost" onClick={prev}>← Prev</button>
              <span>{idx + 1} / {ads.length}</span>
              <button className="btn btn--ghost" onClick={next}>Next →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
