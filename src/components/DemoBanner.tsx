/**
 * DemoBanner — a dismissable warning that this is a testnet tech demo.
 * Dismissal is remembered in localStorage so it doesn't nag on every load.
 */

import { useState } from "react";

const KEY = "datum-tavern:demo-banner-dismissed";

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
  });
  if (dismissed) return null;

  const close = () => {
    try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <div className="demo-banner" role="alert">
      <span className="demo-banner__text">
        ⚠ <b>Tech demo only</b> — runs on the Paseo testnet. <b>Do not connect a wallet holding real funds.</b>
        {" "}Learn about the protocol at{" "}
        <a className="demo-banner__link" href="https://datum.javcon.io" target="_blank" rel="noopener noreferrer">
          datum.javcon.io
        </a>.
      </span>
      <button className="demo-banner__close" onClick={close} aria-label="Dismiss">✕</button>
    </div>
  );
}
