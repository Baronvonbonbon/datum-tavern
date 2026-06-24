/**
 * Barkeep — center-back NPC.
 * Cycles through flavor dialogue; 1 in AD_INTERVAL lines is a sponsored whisper
 * drawn from active Datum campaigns.
 */

import { useState, useCallback } from "react";
import { pickRandomAd, AD_INTERVAL } from "../lib/datumContracts";
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

  const speak = useCallback(async () => {
    _pullIdx++;
    if (_pullIdx % AD_INTERVAL === 0) {
      const ad = await pickRandomAd();
      if (ad) {
        setIsAd(true);
        setAdLabel(ad.advertiser.slice(0, 8) + "…");
        setLine(
          `*leans in and lowers voice* A traveller left coin to spread word about something. ` +
          `Ask me if ye want to know more. [${ad.advertiser.slice(0, 6)}]`
        );
        return;
      }
    }
    setIsAd(false);
    setAdLabel("");
    setLine(BARKEEP_LINES[Math.floor(Math.random() * BARKEEP_LINES.length)]);
  }, []);

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

      <OnChainNote>
        Conversational placement: roughly every third line is a "whispered"
        sponsorship drawn from an active Datum campaign for this tavern, tagged so
        it's clearly marked. The NPC dialogue carries the ad instead of an interstitial.
      </OnChainNote>
    </div>
  );
}
