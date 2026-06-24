/**
 * OnChainNote — a small "what's happening on-chain" footer for each tavern zone.
 * This is the tech-demo takeaway: it names the integration pattern and the
 * contracts involved, so a visitor understands what just happened on-chain.
 * Collapsible so it never competes with the immersion.
 */

import { useState } from "react";

export function OnChainNote({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`onchain-note ${open ? "onchain-note--open" : ""}`}>
      <button className="onchain-note__toggle" onClick={() => setOpen((o) => !o)}>
        {open ? "▾" : "▸"} What's happening on-chain?
      </button>
      {open && <div className="onchain-note__body">{children}</div>}
    </div>
  );
}
