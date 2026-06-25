/**
 * DieFace — a pixel-art die showing 1–6 pips (inline SVG, crisp edges).
 * Used by the Dice mini-game and the wager reveal.
 */

const PIPS: Record<number, [number, number][]> = {
  1: [[2, 2]],
  2: [[1, 1], [3, 3]],
  3: [[1, 1], [2, 2], [3, 3]],
  4: [[1, 1], [1, 3], [3, 1], [3, 3]],
  5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]],
  6: [[1, 1], [1, 2], [1, 3], [3, 1], [3, 2], [3, 3]],
};

const cell = (n: number) => 4 + (n - 1) * 7; // 1..3 → 4 / 11 / 18 (in a 24-unit die)

export function DieFace({ value, size = 44 }: { value: number; size?: number }) {
  const pips = PIPS[Math.min(6, Math.max(1, value))] ?? PIPS[1];
  return (
    <svg className="sprite die-face" width={size} height={size} viewBox="0 0 26 26" shapeRendering="crispEdges" aria-label={`die showing ${value}`}>
      <rect x="2" y="2" width="22" height="22" rx="4" fill="#f4ecd2" />
      <rect x="2" y="2" width="22" height="22" rx="4" fill="none" stroke="#3a2010" strokeWidth="2" />
      <rect x="2" y="2" width="22" height="4" rx="4" fill="rgba(255,255,255,.4)" />
      {pips.map(([c, r], i) => (
        <rect key={i} x={cell(c)} y={cell(r)} width="4" height="4" rx="1" fill="#3a2010" />
      ))}
    </svg>
  );
}
