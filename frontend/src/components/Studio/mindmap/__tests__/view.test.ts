import { describe, expect, it } from "vitest";
import { layoutMindMap, type TreeNode } from "../layout";
import { fitLayout } from "../view";

function makeTree(branches: number, children: number): TreeNode {
  let seq = 0;
  const root: TreeNode = { id: `n-${seq++}`, label: "الجذر", depth: 0, children: [] };
  for (let i = 0; i < branches; i++) {
    const branch: TreeNode = {
      id: `n-${seq++}`,
      label: `الفرع ${i + 1}`,
      depth: 1,
      children: [],
    };
    for (let j = 0; j < children; j++) {
      branch.children.push({
        id: `n-${seq++}`,
        label: `العنصر ${i + 1}.${j + 1}`,
        depth: 2,
        children: [],
      });
    }
    root.children.push(branch);
  }
  return root;
}

describe("mind map viewport", () => {
  it("fits a small map at its natural scale and centres it", () => {
    const layout = layoutMindMap(makeTree(3, 2), "tree", new Set());
    const fit = fitLayout(layout, 800, 440, 0.7);

    expect(fit.clamped).toBe(false);
    expect(fit.k).toBeGreaterThanOrEqual(0.7);
    expect(fit.x).toBeCloseTo((800 - layout.W * fit.k) / 2, 5);
    expect(fit.y).toBeCloseTo((440 - layout.H * fit.k) / 2, 5);
  });

  it("keeps a readable scale and centres the root for a large expanded map", () => {
    const layout = layoutMindMap(makeTree(7, 9), "tree", new Set());
    const fit = fitLayout(layout, 800, 440, 0.7);
    const root = layout.nodes.find((node) => node.depth === 0);

    expect(root).toBeTruthy();
    expect(fit.clamped).toBe(true);
    expect(fit.k).toBe(0.7);
    expect(fit.x).toBeCloseTo(400 - (root!.x + root!.w / 2) * 0.7, 5);
    expect(fit.y).toBeCloseTo(220 - (root!.y + root!.h / 2) * 0.7, 5);
  });
});
