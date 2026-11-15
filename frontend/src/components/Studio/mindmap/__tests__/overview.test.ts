import { describe, expect, it } from "vitest";
import type { StudioMindMap } from "../../../../lib/api";
import { overviewMap } from "../export";

describe("PDF overview map", () => {
  it("keeps only the root and the main branches", () => {
    const map: StudioMindMap = {
      title: "Port Security",
      root: {
        label: "Port Security",
        children: [
          {
            label: "Introduction",
            children: [{ label: "Sticky MAC", children: [{ label: "Learns addresses" }] }],
          },
          { label: "Threats", children: [{ label: "MAC Flooding" }] },
          { label: "Security Features", children: [{ label: "Sticky MAC" }] },
        ],
      },
    };

    const overview = overviewMap(map);

    expect(overview.root.children?.map((branch) => branch.label)).toEqual([
      "Introduction",
      "Threats",
      "Security Features",
    ]);
    expect(overview.root.children?.every((branch) => !branch.children?.length)).toBe(true);
  });

  it("drops blank branch labels", () => {
    const map: StudioMindMap = {
      title: "Map",
      root: {
        label: "Root",
        children: [{ label: "   " }, { label: "Real branch" }],
      },
    };

    expect(overviewMap(map).root.children?.map((branch) => branch.label)).toEqual([
      "Real branch",
    ]);
  });
});
