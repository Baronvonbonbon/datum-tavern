/**
 * Console — the Contract Console.
 *
 * Exposes every TavernBoard / TavernBetting / Datum function the demo touches:
 * read views, and user-submit writes with an inline status readout. Keeps the
 * tavern itself immersive while making the full contract surface reachable.
 */

import { Signer, formatEther } from "ethers";
import { ConsoleAction } from "./console/ConsoleAction";
import { ADDRESSES, ACTION_TYPE } from "../lib/addresses";
import { fetchMessageCount, getMessage, postMessage } from "../lib/tavernBoard";
import {
  betVsHouse, openP2PGame, joinP2PGame, cancelGame,
  getGameCount, getHouseBalanceRead, getGame, GameType,
} from "../lib/tavernBetting";
import { fetchTavernAds, invalidateAdCache } from "../lib/datumContracts";
import { submitClaim, getUserBalance, withdrawEarnings } from "../lib/datumClaims";

interface Props {
  signer: Signer | null;
  address: string | null;
}

const GAME_NAMES = ["DICE", "ARM_WRESTLE", "DARTS", "CARD_DRAW", "HIGH_CARD", "LOW_CARD"];
const noWallet = "connect a wallet";

export function Console({ signer, address }: Props) {
  const w = (fn: (s: Signer) => Promise<string>) => async () => {
    if (!signer) throw new Error("no wallet connected");
    return fn(signer);
  };

  return (
    <div className="console">
      <header className="console__header">
        <h1>⚙ Contract Console</h1>
        <p className="console__sub">
          Direct access to every contract function. Reads are free; writes prompt MetaMask.
        </p>
      </header>

      {/* ── Tavern Board ── */}
      <section className="console__panel">
        <h2>📜 TavernBoard <code>{ADDRESSES.tavernBoard.slice(0, 10)}…</code></h2>

        <ConsoleAction kind="read" title="count()" desc="Number of messages on the board."
          onRun={async () => `${await fetchMessageCount()} messages`} />

        <ConsoleAction kind="read" title="getMessage(id)" fields={[{ name: "id", type: "number", placeholder: "index", default: "0" }]}
          onRun={async (v) => { const m = await getMessage(Number(v.id)); return `${m.author}: "${m.text}"`; }} />

        <ConsoleAction kind="write" title="post(text)" desc="Post an on-chain notice." buttonLabel="Post"
          fields={[{ name: "text", placeholder: "your message" }]}
          disabled={!signer} disabledReason={noWallet}
          onRun={(v) => w((s) => postMessage(s, v.text))()
            .then((h) => `posted — tx ${h.slice(0, 12)}…`)} />
      </section>

      {/* ── Tavern Betting ── */}
      <section className="console__panel">
        <h2>🎲 TavernBetting <code>{ADDRESSES.tavernBetting.slice(0, 10)}…</code></h2>

        <ConsoleAction kind="read" title="gameCount()"
          onRun={async () => `${await getGameCount()} games`} />
        <ConsoleAction kind="read" title="houseBalance()"
          onRun={async () => `${formatEther(await getHouseBalanceRead())} PAS`} />
        <ConsoleAction kind="read" title="getGame(id)" fields={[{ name: "id", type: "number", default: "0" }]}
          onRun={async (v) => { const g = await getGame(BigInt(v.id)); return `${GAME_NAMES[g.gameType] ?? g.gameType} · p1=${g.player1.slice(0,8)}… bet=${formatEther(g.betAmount)} PAS · ${["OPEN","RESOLVED","CANCELLED"][g.state]}`; }} />

        <ConsoleAction kind="write" title="createGame(gameType, vsHouse=true)" desc="Bet vs the house — resolves instantly." buttonLabel="Bet vs House"
          fields={[{ name: "gameType", type: "number", placeholder: "0–5", default: "0" }, { name: "pas", type: "number", placeholder: "PAS", default: "1" }]}
          disabled={!signer} disabledReason={noWallet}
          onRun={(v) => w((s) => betVsHouse(s, Number(v.gameType) as GameType, Number(v.pas)).then((r) => r.p1Wins ? `WIN — payout ${formatEther(r.payout)} PAS` : "house won"))()} />

        <ConsoleAction kind="write" title="createGame(gameType, vsHouse=false)" desc="Open a P2P challenge." buttonLabel="Open P2P"
          fields={[{ name: "gameType", type: "number", default: "0" }, { name: "pas", type: "number", default: "1" }]}
          disabled={!signer} disabledReason={noWallet}
          onRun={(v) => w((s) => openP2PGame(s, Number(v.gameType) as GameType, Number(v.pas)).then((id) => `opened game #${id}`))()} />

        <ConsoleAction kind="write" title="joinGame(id)" desc="Join an open P2P game with the matching bet." buttonLabel="Join"
          fields={[{ name: "id", type: "number" }]}
          disabled={!signer} disabledReason={noWallet}
          onRun={(v) => w((s) => joinP2PGame(s, BigInt(v.id)).then((r) => r.p1Wins ? "you won" : "you lost"))()} />

        <ConsoleAction kind="write" title="cancelGame(id)" desc="Reclaim your stake on an expired P2P game." buttonLabel="Cancel"
          fields={[{ name: "id", type: "number" }]}
          disabled={!signer} disabledReason={noWallet}
          onRun={(v) => w((s) => cancelGame(s, BigInt(v.id)).then((h) => `cancelled — tx ${h.slice(0,12)}…`))()} />
      </section>

      {/* ── Datum ── */}
      <section className="console__panel">
        <h2>🔱 Datum Protocol <code>{ADDRESSES.datumCampaigns.slice(0, 10)}…</code></h2>

        <ConsoleAction kind="read" title="active tavern campaigns" desc="Active campaigns published by this tavern."
          onRun={async () => { invalidateAdCache(); const ads = await fetchTavernAds();
            return ads.length ? ads.map((a) => `#${a.campaignId} ${a.title || "(untitled)"}`).join("\n") : "none"; }} />

        <ConsoleAction kind="read" title="PaymentVault.userBalance(address)" desc="Your accrued (unwithdrawn) ad-revenue share."
          fields={[{ name: "address", placeholder: "0x… (defaults to you)", default: address ?? "" }]}
          onRun={async (v) => `${formatEther(await getUserBalance(v.address || (address ?? "")))} PAS`} />

        <ConsoleAction kind="write" title="submitClaim(campaignId, actionType, eventCount)"
          desc={`Earn for an impression. actionType: ${ACTION_TYPE.VIEW}=view, ${ACTION_TYPE.CLICK}=click, ${ACTION_TYPE.ACTION}=action.`}
          buttonLabel="Submit claim"
          fields={[
            { name: "campaignId", type: "number", placeholder: "campaign id" },
            { name: "actionType", type: "number", placeholder: "0–2", default: "0" },
            { name: "eventCount", type: "number", placeholder: "events", default: "1" },
          ]}
          disabled={!signer} disabledReason={noWallet}
          onRun={(v) => w(async (s) => {
            const r = await submitClaim(s, BigInt(v.campaignId), Number(v.actionType) as 0 | 1 | 2, BigInt(v.eventCount));
            return r.ok ? `accepted — ${r.message}` : `rejected — ${r.message}`;
          })()} />

        <ConsoleAction kind="write" title="PaymentVault.withdrawUser()" desc="Withdraw your accrued earnings to your wallet." buttonLabel="Withdraw"
          disabled={!signer} disabledReason={noWallet}
          onRun={() => w((s) => withdrawEarnings(s).then(() => "withdrawn ✓"))()} />
      </section>
    </div>
  );
}
