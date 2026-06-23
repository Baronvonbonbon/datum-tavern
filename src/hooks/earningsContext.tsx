import { createContext, useContext, ReactNode } from "react";
import { EarningsState } from "./useEarnings";

const EarningsContext = createContext<EarningsState | null>(null);

export function EarningsProvider({ value, children }: { value: EarningsState; children: ReactNode }) {
  return <EarningsContext.Provider value={value}>{children}</EarningsContext.Provider>;
}

/** Access the shared earnings state. Returns null when used outside the provider. */
export function useEarningsContext(): EarningsState | null {
  return useContext(EarningsContext);
}
