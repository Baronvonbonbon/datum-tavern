/**
 * WhatsThis — the "What's all this?" explainer.
 * Rendered inside the shared modal overlay (scrollable). Explains what Datum is,
 * how this tavern is a micro-network example, and links out to learn more.
 */

export function WhatsThis() {
  return (
    <div className="modal whats-this">
      <h2 className="modal__title">🍺 What's all this?</h2>

      <p className="whats-this__lead">
        <b>The Rusty Flagon</b> is a live demo of <b>Datum</b> — a peer-to-peer ad
        network — running on a blockchain testnet. Everything you see is real
        on-chain activity, just with play money.
      </p>

      <section className="whats-this__sec">
        <h3>Datum is a P2P ad network</h3>
        <p>
          Instead of an ad-tech giant sitting in the middle and taking the cut,
          Datum connects three parties directly: <b>advertisers</b> fund campaigns,
          <b> publishers</b> host the placements, and <b>you</b> — the audience —
          earn a real share for the attention you give. Impressions, clicks, and
          actions are verified and settled <b>on-chain</b>, so the value flows
          straight to the people who create it.
        </p>
      </section>

      <section className="whats-this__sec">
        <h3>This tavern is a "micro network"</h3>
        <p>
          The Flagon is one tiny, self-contained ad network: a single publisher
          (the tavern), a handful of advertisers, and its patrons. The ads are
          woven into the world as <b>quests</b>, the <b>barkeep's whispers</b>, the
          <b> town crier</b>, and <b>game sponsorships</b> — never breaking
          immersion. Watch, click, or complete a sponsored action to earn; settle
          your tab with the barkeep and cash out — all without paying gas.
        </p>
      </section>

      <section className="whats-this__sec">
        <h3>Part of a much bigger picture</h3>
        <p>
          This micro network is just one cell. Anyone can spin up their own — a
          game, an app, a storefront, a community — to advertise their digital
          products and services and let their users share in the revenue. Strung
          together, these micro networks form a broader ecosystem that brings
          fair, native, opt-in advertising utility to <b>any digital space</b>.
        </p>
      </section>

      <a
        className="btn btn--primary whats-this__cta"
        href="https://datum.javcon.io"
        target="_blank"
        rel="noopener noreferrer"
      >
        Learn more at datum.javcon.io ↗
      </a>
    </div>
  );
}
