import type { MindMapNode, StudioMindMap } from "../../../lib/api";

export type TextDirection = "rtl" | "ltr";

/** Count Arabic/Hebrew letters against Latin letters in a short label. */
export function textDirection(value: string): TextDirection {
  const text = String(value ?? "");
  const rtl = (text.match(/[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/g) || []).length;
  const ltr = (text.match(/[A-Za-z\u00C0-\u024F]/g) || []).length;
  return rtl > ltr ? "rtl" : "ltr";
}

function collect(node: MindMapNode | undefined, out: string[]) {
  if (!node) return;
  out.push(String(node.label ?? ""));
  for (const child of node.children ?? []) collect(child, out);
}

/**
 * Pick the reading direction for the whole map. The title, root and main
 * branches carry the most weight; detail labels only break ties.
 */
export function mapDirection(map: StudioMindMap): TextDirection {
  const main = [
    String(map.title ?? ""),
    String(map.root?.label ?? ""),
    ...(map.root?.children ?? []).map((child) => String(child?.label ?? "")),
  ].join(" ");
  const direct = textDirection(main);
  if (direct === "ltr") return "ltr";

  const labels: string[] = [];
  collect(map.root, labels);
  return textDirection(labels.join(" "));
}
