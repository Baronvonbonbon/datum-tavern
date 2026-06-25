import { useState, useEffect, useCallback, useRef } from "react";
import { Signer } from "ethers";
import {
  submitClaim, getUserBalance, withdrawEarnings, withdrawGasless, waitForCredit, ClaimResult,
} from "../lib/datumClaims";
import { ACTION_TYPE } from "../lib/addresses";

type ActionType = (typeof ACTION_TYPE)[keyof typeof ACTION_TYPE];

export interface EarningsState {
  balanceWei: bigint;
  busy: boolean;
  status: string | null;
  refresh: () => void;
  claim: (campaignId: bigint, actionType: ActionType, eventCount: bigint) => Promise<ClaimResult>;
  withdraw: () => Promise<void>;
  cashOut: () => Promise<void>;
}

/**
 * Tracks the user's accrued PaymentVault earnings and drives the claim/withdraw
 * actions. Refreshes the balance on connect and every 20s while connected.
 */
export function useEarnings(
  signer: Signer | null,
  address: string | null,
  onWalletChange?: () => void, // refresh the native wallet balance after a cash-out
): EarningsState {
  const [balanceWei, setBalanceWei] = useState<bigint>(0n);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const addrRef = useRef(address);
  addrRef.current = address;

  const refresh = useCallback(() => {
    const a = addrRef.current;
    if (!a) { setBalanceWei(0n); return; }
    getUserBalance(a).then(setBalanceWei).catch(() => { /* keep last */ });
  }, []);

  useEffect(() => {
    if (!address) { setBalanceWei(0n); return; }
    refresh();
    const t = setInterval(refresh, 20_000);
    return () => clearInterval(t);
  }, [address, refresh]);

  const claim = useCallback(
    async (campaignId: bigint, actionType: ActionType, eventCount: bigint): Promise<ClaimResult> => {
      if (!signer || !addrRef.current) {
        return { ok: false, status: 0, message: "connect a wallet first" };
      }
      setBusy(true);
      setStatus("Awaiting signature…");
      try {
        const res = await submitClaim(signer, campaignId, actionType, eventCount);
        if (!res.ok) { setStatus(res.message); return res; }
        setStatus("Settling on-chain…");
        const baseline = await getUserBalance(addrRef.current).catch(() => balanceWei);
        const credited = await waitForCredit(addrRef.current, baseline);
        setBalanceWei(credited);
        setStatus(credited > baseline ? "Coin in the purse! 🪙" : "Submitted — credit pending");
        return res;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "claim failed";
        setStatus(msg);
        return { ok: false, status: 0, message: msg };
      } finally {
        setBusy(false);
      }
    },
    [signer, balanceWei],
  );

  const withdraw = useCallback(async () => {
    if (!signer) return;
    setBusy(true);
    setStatus("Withdrawing to wallet…");
    try {
      await withdrawEarnings(signer);
      setStatus("Withdrawn 🎉");
      refresh();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "withdraw failed");
    } finally {
      setBusy(false);
    }
  }, [signer, refresh]);

  // Gasless cash-out: sign only; the relay submits + pays gas ("barkeep floats
  // you the coin"). Works with a zero-PAS wallet — true gasless onboarding.
  const cashOut = useCallback(async () => {
    if (!signer || !addrRef.current) return;
    if (balanceWei <= 0n) { setStatus("nothing to collect — already cashed out"); return; }
    setBusy(true);
    setStatus("Awaiting signature…");
    try {
      const res = await withdrawGasless(signer);
      setStatus(res.message);
      if (res.ok) {
        // Relay submits; poll until the vault balance drains.
        for (let i = 0; i < 15; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          const b = await getUserBalance(addrRef.current).catch(() => balanceWei);
          setBalanceWei(b);
          if (b === 0n) break;
        }
        onWalletChange?.(); // earnings landed in the wallet — refresh its balance
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "cash-out failed");
    } finally {
      setBusy(false);
    }
  }, [signer, balanceWei, onWalletChange]);

  return { balanceWei, busy, status, refresh, claim, withdraw, cashOut };
}
