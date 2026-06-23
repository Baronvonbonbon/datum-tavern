/**
 * MerchantStall — right-wall hotspot ("The Town Crier").
 *
 * Dedicated sponsored-content surface AND the primary "earn while idle" loop:
 * while a creative is on screen, impressions accrue; the patron collects them
 * as a Datum view-claim (one MetaMask signature → native PAS revenue share).
 * Clicking the call-to-action also files a (higher-value) click-claim.
 */

import { useState, useEffect } from "react";
import { formatEther } from "ethers";
import { fetchTavernAds, DatumAd } from "../lib/datumContracts";
import { useEarningsContext } from "../hooks/earningsContext";
import { ACTION_TYPE } from "../lib/addresses";

const ACCRUE_EVERY_MS = 4000; // one impression every few seconds while viewing
const MAX_ACCRUED = 50;       // cap before the patron must collect

export function MerchantStall() {
  const [ads,     setAds]     = useState<DatumAd[]>([]);
  const [idx,     setIdx]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [impressions, setImpressions] = useState(0);
  const earnings = useEarningsContext();

  useEffect(() => {
    fetchTavernAds()
      .then(setAds)
      .catch(() => setAds([]))
      .finally(() => setLoading(false));
  }, []);

  const current = ads[idx] ?? null;

  // Reset the impression counter when the featured campaign changes.
  useEffect(() => { setImpressions(0); }, [idx]);

  // Accrue impressions while a creative is on screen and a wallet is connected.
  const canEarn = !!earnings && !!current;
  useEffect(() => {
    if (!canEarn) return;
    const t = setInterval(() => {
      setImpressions((n) => Math.min(MAX_ACCRUED, n + 1));
    }, ACCRUE_EVERY_MS);
    return () => clearInterval(t);
  }, [canEarn, idx]);

  const next = () => setIdx(i => (i + 1) % Math.max(1, ads.length));
  const prev = () => setIdx(i => (i - 1 + Math.max(1, ads.length)) % Math.max(1, ads.length));

  const collectViews = async () => {
    if (!earnings || !current || impressions <= 0) return;
    const res = await earnings.claim(current.campaignId, ACTION_TYPE.VIEW, BigInt(impressions));
    if (res.ok) setImpressions(0);
  };

  // Rough "worth" of the accrued impressions: viewBid is per-1000 (CPM).
  const viewWorthWei = current ? (current.viewBidWei * BigInt(impressions)) / 1000n : 0n;

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

          {/* ── earn-while-idle meter ── */}
          {earnings ? (
            <div className="merchant-stall__earn">
              <span className="merchant-stall__imp">
                👁 {impressions} impression{impressions === 1 ? "" : "s"} watched
                {impressions > 0 && ` · ~${Number(formatEther(viewWorthWei)).toFixed(5)} PAS`}
              </span>
              <button
                className="btn btn--secondary"
                onClick={collectViews}
                disabled={earnings.busy || impressions <= 0}
              >
                {earnings.busy ? "Collecting…" : "Collect impressions"}
              </button>
              {earnings.status && <span className="merchant-stall__earn-status">{earnings.status}</span>}
            </div>
          ) : (
            <p className="hint">Connect a wallet to earn a share for watching.</p>
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
