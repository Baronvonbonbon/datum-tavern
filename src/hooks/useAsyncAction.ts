import { useState, useCallback } from "react";

export type ActionPhase = "idle" | "pending" | "success" | "error";

export interface AsyncAction<T> {
  phase: ActionPhase;
  message: string | null;   // status line (pending label, error text, or success note)
  result: T | null;         // last successful result
  busy: boolean;
  run: (fn: () => Promise<T>, opts?: { pending?: string; success?: (r: T) => string }) => Promise<T | undefined>;
  reset: () => void;
}

/**
 * Wraps an async submit/call with consistent status readout:
 *   idle → pending (label) → success (note + result) | error (message).
 * Used by every user-submit surface (Console, board posts, bets, claims).
 */
export function useAsyncAction<T = unknown>(): AsyncAction<T> {
  const [phase, setPhase] = useState<ActionPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<T | null>(null);

  const run = useCallback(async (
    fn: () => Promise<T>,
    opts?: { pending?: string; success?: (r: T) => string },
  ) => {
    setPhase("pending");
    setMessage(opts?.pending ?? "Working…");
    setResult(null);
    try {
      const r = await fn();
      setResult(r);
      setPhase("success");
      setMessage(opts?.success ? opts.success(r) : "Done ✓");
      return r;
    } catch (e: unknown) {
      setPhase("error");
      const raw = e instanceof Error ? e.message : String(e);
      // Surface the useful bit of long ethers/RPC errors.
      setMessage(raw.length > 200 ? raw.slice(0, 200) + "…" : raw);
      return undefined;
    }
  }, []);

  const reset = useCallback(() => { setPhase("idle"); setMessage(null); setResult(null); }, []);

  return { phase, message, result, busy: phase === "pending", run, reset };
}
