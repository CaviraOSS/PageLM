import type { Layout } from "./layout";

export type FitView = {
  k: number;
  x: number;
  y: number;
  /** True when the map was too large to fit at the requested readable scale. */
  clamped: boolean;
};

/**
 * Compute a viewport transform for a mind-map layout.
 *
 * Small maps are centred and fully fitted. Maps that would need an unreadable
 * scale are kept at `minScale` and centred on the root, so the user pans
 * through a readable map instead of looking at a tiny overview.
 */
export function fitLayout(
  layout: Layout,
  width: number,
  height: number,
  minScale: number,
  maxScale = 1.15,
): FitView {
  const cw = width || 800;
  const ch = height || 560;
  const natural = Math.min((cw - 32) / layout.W, (ch - 32) / layout.H);
  const floor = Math.max(0.01, minScale);
  const k = Math.min(maxScale, Math.max(floor, natural));
  const root = layout.nodes.find((node) => node.depth === 0);

  if (natural < floor && root) {
    return {
      k,
      x: cw / 2 - (root.x + root.w / 2) * k,
      y: ch / 2 - (root.y + root.h / 2) * k,
      clamped: true,
    };
  }

  return {
    k,
    x: (cw - layout.W * k) / 2,
    y: (ch - layout.H * k) / 2,
    clamped: false,
  };
}
