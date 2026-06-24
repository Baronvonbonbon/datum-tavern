/**
 * Barkeep — center-back NPC.
 * Cycles through flavor dialogue; ~1 in AD_INTERVAL lines is a sponsored whisper
 * from an active Datum campaign. The whispers you hear become your "tab" — and
 * you settle the tab (a Datum view-claim) right here for your cut.
 */

import { useState, useCallback } from "react";
import { formatEther } from "ethers";
import { pickRandomAd, AD_INTERVAL, DatumAd } from "../lib/datumContracts";
import { useEarningsContext } from "../hooks/earningsContext";
import { ACTION_TYPE } from "../lib/addresses";
import { OnChainNote } from "./OnChainNote";

const BARKEEP_LINES = [
  "Storm's comin' from the north. Best stay another night.",
  "Heard the miller's daughter got herself mixed up with the thieves' guild. None of my business.",
  "Ale's fresh. Bread's stale. That's the deal, take it or leave it.",
  "Traveller came through last week raving about dragons in the Ashwood. Drank three flagons then left without paying.",
  "Keep yer hands where I can see 'em. Both of 'em.",
  "The last person who tried to start a fight in here is now part of the foundation.",
  "Mayor's raising taxes again. My taxes are raised daily. It's called the bar tab.",
  "You look like you've been rode hard and put away wet. Drink?",
  "Used to be an adventurer. Then I took a mortgage.",
  "No, we don't serve heroes here. *Everybody* pays.",
];

let _pullIdx = 0;

export function Barkeep() {
  const [line,    setLine]    = useState<string | null>(null);
  const [isAd,    setIsAd]    = useState(false);
  const [adLabel, setAdLabel] = useState("");
  const [whispers, setWhispers] = useState(0);          // sponsored whispers heard ("your tab")
  const [tabAd,    setTabAd]    = useState<DatumAd | null>(null); // campaign to settle against
  const earnings = useEarningsContext();

  const speak = useCallback(async () => {
    _pullIdx++;
    if (_pullIdx % AD_INTERVAL === 0) {
      const ad = await pickRandomAd();
      if (ad) {
        setIsAd(true);
        setAdLabel(ad.title || ad.advertiser.slice(0, 8) + "…");
        setWhispers((w) => w + 1);
        setTabAd(ad);
        setLine(
          `*leans in and lowers voice* "${ad.title || "A traveller"}" left coin to spread word — ` +
          `that's another mark on yer tab. Settle up when ye like.`
        );
        return;
      }
    }
    setIsAd(false);
    setAdLabel("");
    setLine(BARKEEP_LINES[Math.floor(Math.random() * BARKEEP_LINES.length)]);
  }, []);

  const settleTab = async () => {
    if (!earnings || !tabAd || whispers <= 0) return;
    const res = await earnings.claim(tabAd.campaignId, ACTION_TYPE.VIEW, BigInt(whispers));
    if (res.ok) setWhispers(0);
  };

  // What the tab is worth: viewBid is per-1000 (CPM) × whispers heard.
  const tabWei = tabAd ? (tabAd.viewBidWei * BigInt(whispers)) / 1000n : 0n;

  return (
    <div className="modal barkeep">
      <h2 className="modal__title">🍺 The Barkeep</h2>

      <div className="barkeep__npc">
        <div className="barkeep__sprite" aria-label="Barkeep NPC">
          {/* Pixel art barkeep — rendered in CSS */}
        </div>

        {line && (
          <div className={`barkeep__bubble ${isAd ? "barkeep__bubble--sponsored" : ""}`}>
            {isAd && <span className="barkeep__whisper-tag">📣 {adLabel}</span>}
            <p>{line}</p>
          </div>
        )}
      </div>

      <button className="btn btn--secondary" onClick={speak}>
        {line ? "Say Something Else" : "Talk to the Barkeep"}
      </button>

      {/* ── Settle the Tab: a tavern-level Datum claim ── */}
      <div className="barkeep__tab">
        <span className="barkeep__tab-line">
          🧾 Your tab: <b>{whispers}</b> whisper{whispers === 1 ? "" : "s"} heard
          {whispers > 0 && ` · worth ~${Number(formatEther(tabWei)).toFixed(5)} PAS`}
        </span>
        {earnings ? (
          <button
            className="btn btn--primary"
            onClick={settleTab}
            disabled={earnings.busy || whispers <= 0}
            title="Settle your tab — claim your cut for the sponsored whispers you've heard"
          >
            {earnings.busy ? "Squaring up…" : "💰 Settle the Tab"}
          </button>
        ) : (
          <span className="hint">Connect a wallet to settle your tab for coin.</span>
        )}
        {earnings?.status && <span className="barkeep__tab-status">{earnings.status}</span>}
      </div>

      <OnChainNote>
        Conversational placement: ~every third line is a "whispered" sponsorship
        from an active Datum campaign, clearly tagged. The whispers tally your
        <b> tab</b>; <b>Settle the Tab</b> files a Datum view-claim for that many
        impressions — the relay settles it on <code>DatumSettlement</code> and
        your revenue share lands in <code>PaymentVault</code> (collect it in the
        wallet bar). The dialogue carries the ad instead of an interstitial.
      </OnChainNote>
    </div>
  );
}
