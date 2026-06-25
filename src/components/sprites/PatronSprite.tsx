/**
 * PatronSprite — a hooded tavern patron (inline pixel-art SVG) nursing a mug.
 * `tone` recolors the cloak so a crowd doesn't look identical. Idle sway via CSS.
 */

const TONES: Record<string, { cloak: string; cloakD: string }> = {
  green: { cloak: "#2a6032", cloakD: "#1d4423" },
  red:   { cloak: "#7a2424", cloakD: "#561818" },
  blue:  { cloak: "#2a4a60", cloakD: "#1d3344" },
  brown: { cloak: "#6b4020", cloakD: "#4a2a12" },
};
const SKIN = "#d9a066", MUG = "#c8860a", FROTH = "#fff4d6", DARK = "#1a1008";

export function PatronSprite({ tone = "green" }: { tone?: keyof typeof TONES }) {
  const c = TONES[tone] ?? TONES.green;
  return (
    <svg className="sprite sprite--patron" viewBox="0 0 24 30" shapeRendering="crispEdges" aria-hidden="true">
      {/* hood */}
      <rect x="6" y="2" width="12" height="6" fill={c.cloak} />
      <rect x="5" y="6" width="14" height="3" fill={c.cloak} />
      {/* shadowed face */}
      <rect x="8" y="7" width="8" height="4" fill={DARK} />
      <rect x="9" y="9" width="2" height="1" fill={SKIN} />
      <rect x="13" y="9" width="2" height="1" fill={SKIN} />
      {/* cloak body */}
      <rect x="5"  y="11" width="14" height="16" fill={c.cloak} />
      <rect x="5"  y="11" width="3"  height="16" fill={c.cloakD} />
      <rect x="11" y="11" width="2"  height="16" fill={c.cloakD} />
      {/* arm + mug */}
      <rect x="16" y="15" width="3" height="2" fill={c.cloakD} />
      <rect x="18" y="13" width="4" height="2" fill={FROTH} />
      <rect x="18" y="15" width="4" height="5" fill={MUG} />
    </svg>
  );
}
