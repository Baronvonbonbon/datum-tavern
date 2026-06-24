/**
 * tabContext — the patron's running "tab" of unsettled ad impressions.
 *
 * Every ad surface (Town Crier, Quest Board, Barkeep) accrues impressions for a
 * campaign into this shared ledger. The Barkeep's "Settle the Tab" lists the
 * pending claims and settles each through the gasless relay path (a view-claim
 * the relay submits, so the patron only signs).
 */

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface TabEntry {
  campaignId: bigint;
  title: string;
  viewBidWei: bigint; // CPM (per-1000) — for the "worth" estimate
  count: number;      // unsettled impressions accrued for this campaign
}

const MAX_PER_CAMPAIGN = 25; // cap so a claim's PoW stays quick

export interface TabState {
  entries: TabEntry[];
  total: number;
  accrue: (e: { campaignId: bigint; title: string; viewBidWei: bigint }, n?: number) => void;
  clear: (campaignId: bigint) => void;
}

const TabContext = createContext<TabState | null>(null);

export function TabProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState<Record<string, TabEntry>>({});

  const accrue = useCallback((e: { campaignId: bigint; title: string; viewBidWei: bigint }, n = 1) => {
    const k = e.campaignId.toString();
    setMap((m) => {
      const prev = m[k];
      const count = Math.min(MAX_PER_CAMPAIGN, (prev?.count ?? 0) + n);
      return { ...m, [k]: { campaignId: e.campaignId, title: e.title, viewBidWei: e.viewBidWei, count } };
    });
  }, []);

  const clear = useCallback((campaignId: bigint) => {
    setMap((m) => { const c = { ...m }; delete c[campaignId.toString()]; return c; });
  }, []);

  const entries = Object.values(map).filter((e) => e.count > 0);
  const total = entries.reduce((s, e) => s + e.count, 0);

  return <TabContext.Provider value={{ entries, total, accrue, clear }}>{children}</TabContext.Provider>;
}

/** Shared impression ledger. Null outside the provider. */
export function useTab(): TabState | null {
  return useContext(TabContext);
}
