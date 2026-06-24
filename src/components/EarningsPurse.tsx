/**
 * EarningsPurse — the "earn while idle" readout.
 * Shows the user's accrued Datum revenue share (PaymentVault.userBalance) and a
 * button to withdraw it to their wallet. Lives in the WalletBar when connected.
 */

import { formatEther } from "ethers";
import { EarningsState } from "../hooks/useEarnings";

export function EarningsPurse({ earnings }: { earnings: EarningsState }) {
  const pas = Number(formatEther(earnings.balanceWei));
  const hasCoin = earnings.balanceWei > 0n;

  return (
    <div className="purse" title="Your Datum ad-revenue share, earned from viewing sponsored content">
      <span className="purse__icon">🪙</span>
      <span className="purse__amount">{pas.toFixed(4)} PAS</span>
      <button
        className="btn btn--ghost purse__withdraw"
        onClick={() => void earnings.cashOut()}
        disabled={earnings.busy || !hasCoin}
        title="Cash out to your wallet — gasless (the barkeep floats the fee)"
      >
        {earnings.busy ? "…" : "Collect"}
      </button>
      {earnings.status && <span className="purse__status">{earnings.status}</span>}
    </div>
  );
}
