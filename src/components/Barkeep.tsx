/**
 * Barkeep — center-back NPC and the tavern's settlement hub.
 *
 * ~1 in AD_INTERVAL dialogue lines is a sponsored whisper from a Datum campaign
 * (adds to your tab). "Settle the Tab" lists EVERY unsettled impression claim
 * accrued across the tavern (Town Crier, Quest Board, Barkeep) and settles each
 * through the gasless relay path — a view-claim the relay submits, so you only
 * sign and pay no gas.
 */

import { useState, useCallback } from "react";
import { formatEther } from "ethers";
import { pickRandomAd, AD_INTERVAL } from "../lib/datumContracts";
import { useEarningsContext } from "../hooks/earningsContext";
import { useTab } from "../hooks/tabContext";
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
  const earnings = useEarningsContext();
  const tab = useTab();

  const speak = useCallback(async () => {
    _pullIdx++;
    if (_pullIdx % AD_INTERVAL === 0) {
      const ad = await pickRandomAd();
      if (ad) {
        setIsAd(true);
        setAdLabel(ad.title || ad.advertiser.slice(0, 8) + "…");
        // Heard a whisper → one impression on the tab for that campaign.
        tab?.accrue({ campaignId: ad.campaignId, title: ad.title || `Campaign #${ad.campaignId}`, viewBidWei: ad.viewBidWei });
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
  }, [tab]);

  const entries = tab?.entries ?? [];
  const worthWei = (viewBidWei: bigint, count: number) => (viewBidWei * BigInt(count)) / 1000n;
  const totalWorthWei = entries.reduce((s, e) => s + worthWei(e.viewBidWei, e.count), 0n);

  // Settle one campaign's impressions via the gasless relay; clear on success.
  const settle = async (campaignId: bigint, count: number) => {
    if (!earnings) return;
    const res = await earnings.claim(campaignId, ACTION_TYPE.VIEW, BigInt(count));
    if (res.ok) tab?.clear(campaignId);
  };
  const settleAll = async () => {
    for (const e of entries) {
      if (!earnings || earnings.busy) break;
      await settle(e.campaignId, e.count);
    }
  };

  return (
    <div className="modal barkeep">
      <h2 className="modal__title">🍺 The Barkeep</h2>

      <div className="barkeep__npc">
        <div className="barkeep__sprite" aria-label="Barkeep NPC" />
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

      {/* ── Settle the Tab: every unsettled impression claim, gasless ── */}
      <div className="barkeep__tab">
        <div className="barkeep__tab-head">
          <span>🧾 Your Tab</span>
          {entries.length > 0 && (
            <span className="barkeep__tab-total">
              {tab?.total} impression{tab?.total === 1 ? "" : "s"} · ~{Number(formatEther(totalWorthWei)).toFixed(5)} PAS
            </span>
          )}
        </div>

        {entries.length === 0 ? (
          <p className="hint">No impressions yet — watch the Town Crier, pull the Quest Board, or chat for whispers, then settle here.</p>
        ) : (
          <>
            <ul className="barkeep__tab-list">
              {entries.map((e) => (
                <li key={e.campaignId.toString()} className="barkeep__tab-row">
                  <span className="barkeep__tab-camp">
                    {e.title} <span className="barkeep__tab-cid">#{e.campaignId.toString()}</span>
                  </span>
                  <span className="barkeep__tab-cnt">
                    {e.count} × · ~{Number(formatEther(worthWei(e.viewBidWei, e.count))).toFixed(5)} PAS
                  </span>
                  <button
                    className="btn btn--secondary barkeep__tab-settle"
                    onClick={() => settle(e.campaignId, e.count)}
                    disabled={!earnings || earnings.busy}
                  >
                    Settle
                  </button>
                </li>
              ))}
            </ul>
            {earnings ? (
              <button className="btn btn--primary" onClick={settleAll} disabled={earnings.busy}>
                {earnings.busy ? "Squaring up…" : "💰 Settle the Whole Tab"}
              </button>
            ) : (
              <span className="hint">Connect a wallet to settle your tab for coin.</span>
            )}
            {earnings?.status && <span className="barkeep__tab-status">{earnings.status}</span>}
          </>
        )}
      </div>

      {/* ── Gasless cash-out: the barkeep floats you the coin ── */}
      {earnings && earnings.balanceWei > 0n && (
        <div className="barkeep__cashout">
          <span className="barkeep__cashout-line">
            💰 The barkeep can float you the coin — cash out{" "}
            <b>{Number(formatEther(earnings.balanceWei)).toFixed(5)} PAS</b> to your wallet, <b>gasless</b>.
          </span>
          <button className="btn btn--primary" onClick={() => void earnings.cashOut()} disabled={earnings.busy}>
            {earnings.busy ? "Counting coin…" : "🪙 Cash Out (gasless)"}
          </button>
        </div>
      )}

      <OnChainNote>
        The Barkeep is the tavern's settlement hub. Every ad surface — Town Crier,
        Quest Board, and these whispers — adds impressions to a shared <b>tab</b>.
        Each row is one campaign's unsettled views; <b>Settle</b> files an EIP-712
        view-claim the relay submits via <code>DatumRelay.settleClaimsFor</code>
        (gasless — you only sign), crediting your share to <code>PaymentVault</code>.
        <b> Cash Out</b> is gasless too: you sign a <code>WithdrawAuth</code> and the
        relay submits <code>withdrawUserBySig</code> + pays the gas — so a fresh
        wallet with zero PAS can earn AND cash out without ever holding gas.
      </OnChainNote>
    </div>
  );
}
