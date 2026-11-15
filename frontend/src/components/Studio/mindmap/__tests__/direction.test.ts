import { describe, expect, it } from "vitest";
import type { StudioMindMap } from "../../../../lib/api";
import { mapDirection, textDirection } from "../direction";
import { layoutMindMap, type TreeNode } from "../layout";

function makeTree(branches: number): TreeNode {
  let seq = 0;
  const root: TreeNode = { id: `n-${seq++}`, label: "Root", depth: 0, children: [] };
  for (let i = 0; i < branches; i++) {
    root.children.push({ id: `n-${seq++}`, label: `Branch ${i + 1}`, depth: 1, children: [] });
  }
  return root;
}

describe("mind map direction", () => {
  it("detects the dominant language of labels", () => {
    expect(textDirection("Port Security on Switches")).toBe("ltr");
    expect(textDirection("النهايات والاتصال")).toBe("rtl");
    expect(textDirection("Cisco IOS — أوامر التحقق")).toBe("rtl");
  });

  it("uses the title and main branches for the map direction", () => {
    const english: StudioMindMap = {
      title: "Port Security on Switches",
      root: { label: "Port Security", children: [{ label: "Threats" }, { label: "Features" }] },
    };
    const arabic: StudioMindMap = {
      title: "مقدمة في التفاضل والتكامل",
      root: { label: "التفاضل والتكامل", children: [{ label: "النهايات" }, { label: "المشتقات" }] },
    };
    expect(mapDirection(english)).toBe("ltr");
    expect(mapDirection(arabic)).toBe("rtl");
  });

  it("lays a tree left-to-right for English and right-to-left for Arabic", () => {
    const tree = makeTree(3);
    const ltr = layoutMindMap(tree, "tree", new Set(), "ltr");
    const rtl = layoutMindMap(tree, "tree", new Set(), "rtl");
    const rootOf = (layout: ReturnType<typeof layoutMindMap>) =>
      layout.nodes.find((node) => node.depth === 0)!;
    const branchOf = (layout: ReturnType<typeof layoutMindMap>) =>
      layout.nodes.find((node) => node.depth === 1)!;

    expect(branchOf(ltr).x).toBeGreaterThan(rootOf(ltr).x);
    expect(branchOf(rtl).x).toBeLessThan(rootOf(rtl).x);
  });
});
