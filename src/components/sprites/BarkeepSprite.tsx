/**
 * BarkeepSprite — hand-built pixel-art bartender (inline SVG, crisp edges).
 * A brimmed hat, mustachioed face, apron, and a raised frothy mug. The idle
 * bob/blink is driven by CSS (.sprite--barkeep).
 */

const SKIN = "#d9a066", SKIN_D = "#b07a44";
const HAT = "#5c3317", HAT_D = "#3a2010";
const SHIRT = "#e8d8a0", APRON = "#2a1808", BELT = "#6b4020";
const DARK = "#1a1008", MUG = "#c8860a", FROTH = "#fff4d6";

export function BarkeepSprite() {
  return (
    <svg className="sprite sprite--barkeep" viewBox="0 0 32 40" shapeRendering="crispEdges" aria-hidden="true">
      {/* hat */}
      <rect x="11" y="2" width="10" height="4" fill={HAT} />
      <rect x="7"  y="6" width="18" height="2" fill={HAT_D} />
      {/* face */}
      <rect x="10" y="8" width="12" height="7" fill={SKIN} />
      <rect x="10" y="14" width="12" height="1" fill={SKIN_D} />
      {/* eyes */}
      <rect className="sprite__eyes" x="13" y="10" width="2" height="2" fill={DARK} />
      <rect className="sprite__eyes" x="17" y="10" width="2" height="2" fill={DARK} />
      {/* big mustache */}
      <rect x="11" y="13" width="10" height="2" fill={HAT} />
      <rect x="10" y="14" width="2"  height="1" fill={HAT} />
      <rect x="20" y="14" width="2"  height="1" fill={HAT} />
      {/* neck + collar */}
      <rect x="14" y="15" width="4" height="2" fill={SKIN_D} />
      {/* body / shirt */}
      <rect x="8"  y="17" width="16" height="15" fill={SHIRT} />
      {/* apron */}
      <rect x="11" y="19" width="10" height="13" fill={APRON} />
      <rect x="13" y="17" width="6"  height="2"  fill={APRON} />
      {/* belt */}
      <rect x="8"  y="24" width="16" height="2"  fill={BELT} />
      {/* left arm */}
      <rect x="6"  y="18" width="2"  height="9"  fill={SHIRT} />
      <rect x="6"  y="26" width="2"  height="2"  fill={SKIN} />
      {/* right arm raised toward the mug */}
      <rect x="24" y="17" width="2"  height="6"  fill={SHIRT} />
      <rect x="24" y="21" width="2"  height="2"  fill={SKIN} />
      {/* mug */}
      <g className="sprite__mug">
        <rect x="26" y="18" width="5" height="2" fill={FROTH} />
        <rect x="26" y="20" width="5" height="6" fill={MUG} />
        <rect x="31" y="21" width="1" height="3" fill={MUG} />
        <rect x="27" y="21" width="3" height="4" fill="#e0a020" />
      </g>
    </svg>
  );
}
