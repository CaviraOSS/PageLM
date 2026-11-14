import type { MindMapTemplate } from "../../../lib/api";
import type { TextDirection } from "./direction";

export type TreeNode = {
  id: string;
  label: string;
  depth: number;
  children: TreeNode[];
};

export type FlatNode = TreeNode & { x: number; y: number; w: number; h: number };

export type Link = {
  id: string;
  from: FlatNode;
  to: FlatNode;
  depth: number;
  d: string;
};

export type Layout = {
  nodes: FlatNode[];
  links: Link[];
  W: number;
  H: number;
  total: number;
  visible: number;
};

export const MINDMAP_TEMPLATES: { id: MindMapTemplate; name: string; hint: string }[] = [
  { id: "tree", name: "شجرة جانبية", hint: "الأكثر وضوحًا للمواضيع العامة" },
  { id: "balanced", name: "شجرة متوازنة", hint: "مناسبة للمقارنات والمحورين" },
  { id: "org", name: "هرمية عمودية", hint: "مناسبة للتصنيفات والمستويات" },
  { id: "radial", name: "إشعاعية", hint: "مفهوم مركزي وعدة جوانب" },
  { id: "arc", name: "قوس مفتوح", hint: "فروع متوازنة حول محور واحد" },
  { id: "timeline", name: "خط مراحل", hint: "مناسبة للعمليات والخطوات" },
  { id: "stairs", name: "سلّم المراحل", hint: "تدرّج الخطوات من مرحلة إلى أخرى" },
  { id: "outline", name: "مخطط تفصيلي", hint: "قائمة متدرجة سهلة القراءة" },
  { id: "fishbone", name: "عظمة السمكة", hint: "مناسبة للأسباب والعوامل" },
  { id: "columns", name: "أعمدة منظمة", hint: "فروع كثيرة في أعمدة مرتبة" },
  { id: "lanes", name: "مسارات أفقية", hint: "فروع مستقلة في صفوف واضحة" },
  { id: "matrix", name: "شبكة مصفوفة", hint: "عدة فئات في شبكة منظمة" },
];

export function normalizeTemplate(v: unknown): MindMapTemplate {
  const t = String(v ?? "").toLowerCase();
  return MINDMAP_TEMPLATES.some((x) => x.id === t) ? (t as MindMapTemplate) : "tree";
}

const COL_W = [250, 212, 188, 168];
const COL_H = [78, 56, 50, 44];
const COL_GAP = 72;
const ROW_GAP = 16;
const PAD = 48;

type RawLink = { from: FlatNode; to: FlatNode; depth: number; kind: "h" | "v" | "line" | "fish" };

function clampDepth(d: number) {
  return Math.min(Math.max(d, 0), 3);
}

function kidsOf(n: TreeNode, collapsed: Set<string>) {
  return collapsed.has(n.id) ? [] : n.children;
}

export function walkAll(node: TreeNode, out: TreeNode[] = []): TreeNode[] {
  out.push(node);
  for (const child of node.children) walkAll(child, out);
  return out;
}

function edgeH(from: FlatNode, to: FlatNode) {
  const ltr = to.x + to.w / 2 >= from.x + from.w / 2;
  const x1 = ltr ? from.x + from.w : from.x;
  const x2 = ltr ? to.x : to.x + to.w;
  const y1 = from.y + from.h / 2;
  const y2 = to.y + to.h / 2;
  const bend = Math.max(26, Math.abs(x1 - x2) * 0.48);
  const c1 = ltr ? x1 + bend : x1 - bend;
  const c2 = ltr ? x2 - bend : x2 + bend;
  return `M ${x1} ${y1} C ${c1} ${y1}, ${c2} ${y2}, ${x2} ${y2}`;
}

function edgeV(from: FlatNode, to: FlatNode) {
  const down = to.y >= from.y;
  const x1 = from.x + from.w / 2;
  const y1 = down ? from.y + from.h : from.y;
  const x2 = to.x + to.w / 2;
  const y2 = down ? to.y : to.y + to.h;
  const bend = Math.max(24, Math.abs(y2 - y1) * 0.5);
  const c1 = down ? y1 + bend : y1 - bend;
  const c2 = down ? y2 - bend : y2 + bend;
  return `M ${x1} ${y1} C ${x1} ${c1}, ${x2} ${c2}, ${x2} ${y2}`;
}

function edgeLine(from: FlatNode, to: FlatNode) {
  const x1 = from.x + from.w / 2;
  const y1 = from.y + from.h / 2;
  const x2 = to.x + to.w / 2;
  const y2 = to.y + to.h / 2;
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

function edgeFish(from: FlatNode, to: FlatNode) {
  const x1 = from.x + from.w;
  const y1 = from.y + from.h / 2;
  const x2 = to.x + to.w / 2;
  const y2 = to.y + to.h / 2;
  const vx = x2 - 90;
  return `M ${x1} ${y1} L ${vx} ${y1} L ${x2} ${y2}`;
}

function finalize(
  nodes: FlatNode[],
  rawLinks: RawLink[],
  total: number,
): Layout {
  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxX = Math.max(...nodes.map((n) => n.x + n.w));
  const maxY = Math.max(...nodes.map((n) => n.y + n.h));
  for (const n of nodes) {
    n.x += PAD - minX;
    n.y += PAD - minY;
  }
  const links = rawLinks.map((l) => ({
    id: `${l.from.id}->${l.to.id}`,
    from: l.from,
    to: l.to,
    depth: l.depth,
    d:
      l.kind === "h"
        ? edgeH(l.from, l.to)
        : l.kind === "v"
          ? edgeV(l.from, l.to)
          : l.kind === "fish"
            ? edgeFish(l.from, l.to)
            : edgeLine(l.from, l.to),
  }));
  return {
    nodes,
    links,
    W: maxX - minX + PAD * 2,
    H: maxY - minY + PAD * 2,
    total,
    visible: nodes.length,
  };
}

/* ---------------------------------------------------------------- tree ---- */

function horizontalLayout(
  root: TreeNode,
  collapsed: Set<string>,
  dir: 1 | -1,
): Layout {
  const leftAt = [0, 0, 0, 0];
  const rightAt = [0, 0, 0, 0];
  for (let d = 1; d < 4; d++) {
    leftAt[d] = leftAt[d - 1] + COL_W[d - 1] + COL_GAP;
    rightAt[d] = rightAt[d - 1] - COL_GAP - COL_W[d];
  }

  const heights = new Map<string, number>();
  const measure = (n: TreeNode): number => {
    const kids = kidsOf(n, collapsed);
    const self = COL_H[clampDepth(n.depth)];
    if (!kids.length) {
      heights.set(n.id, self);
      return self;
    }
    let total = 0;
    kids.forEach((k, i) => {
      total += measure(k) + (i ? ROW_GAP : 0);
    });
    heights.set(n.id, total);
    return total;
  };
  const rootH = measure(root);

  const nodes: FlatNode[] = [];
  const rawLinks: RawLink[] = [];

  const place = (n: TreeNode, top: number): FlatNode => {
    const d = clampDepth(n.depth);
    const h = COL_H[d];
    const w = COL_W[d];
    const total = heights.get(n.id) ?? h;
    const node: FlatNode = {
      ...n,
      x: dir === 1 ? leftAt[d] : rightAt[d],
      y: top + total / 2 - h / 2,
      w,
      h,
    };
    nodes.push(node);
    const kids = kidsOf(n, collapsed);
    let cursor = top;
    for (const k of kids) {
      const kh = heights.get(k.id) ?? COL_H[clampDepth(k.depth)];
      const child = place(k, cursor);
      rawLinks.push({ from: node, to: child, depth: child.depth, kind: "h" });
      cursor += kh + ROW_GAP;
    }
    return node;
  };

  place(root, 0);
  return finalize(nodes, rawLinks, walkAll(root).length);
}

/* ------------------------------------------------------------ balanced ---- */

function branchStack(
  branches: TreeNode[],
  collapsed: Set<string>,
  dir: 1 | -1,
): { nodes: FlatNode[]; links: RawLink[]; height: number; span: number } {
  const leftAt = [0, 0, 0, 0];
  const rightAt = [0, 0, 0, 0];
  for (let d = 1; d < 4; d++) {
    leftAt[d] = leftAt[d - 1] + COL_W[d - 1] + COL_GAP;
    rightAt[d] = rightAt[d - 1] - COL_GAP - COL_W[d];
  }

  const heights = new Map<string, number>();
  const measure = (n: TreeNode): number => {
    const kids = kidsOf(n, collapsed);
    const self = COL_H[clampDepth(n.depth)];
    if (!kids.length) {
      heights.set(n.id, self);
      return self;
    }
    let total = 0;
    kids.forEach((k, i) => {
      total += measure(k) + (i ? ROW_GAP : 0);
    });
    heights.set(n.id, total);
    return total;
  };

  const nodes: FlatNode[] = [];
  const links: RawLink[] = [];

  const place = (n: TreeNode, top: number): FlatNode => {
    const d = clampDepth(n.depth);
    const h = COL_H[d];
    const w = COL_W[d];
    const total = heights.get(n.id) ?? h;
    const node: FlatNode = {
      ...n,
      x: dir === 1 ? leftAt[d] : rightAt[d],
      y: top + total / 2 - h / 2,
      w,
      h,
    };
    nodes.push(node);
    const kids = kidsOf(n, collapsed);
    let cursor = top;
    for (const k of kids) {
      const kh = heights.get(k.id) ?? COL_H[clampDepth(k.depth)];
      const child = place(k, cursor);
      links.push({ from: node, to: child, depth: child.depth, kind: "h" });
      cursor += kh + ROW_GAP;
    }
    return node;
  };

  let height = 0;
  let span = 0;
  branches.forEach((b, i) => {
    if (i) height += ROW_GAP;
    height += measure(b);
  });
  let cursor = 0;
  for (const b of branches) {
    place(b, cursor);
    cursor += (heights.get(b.id) ?? COL_H[clampDepth(b.depth)]) + ROW_GAP;
    span = Math.max(span, COL_W[clampDepth(b.depth)]);
  }
  return { nodes, links, height, span };
}

function balancedLayout(root: TreeNode, collapsed: Set<string>): Layout {
  const kids = kidsOf(root, collapsed);
  const leftBranches: TreeNode[] = [];
  const rightBranches: TreeNode[] = [];
  const weight = (n: TreeNode): number => {
    const ks = kidsOf(n, collapsed);
    return ks.length ? ks.reduce((s, k) => s + weight(k), 0) : 1;
  };
  let leftWeight = 0;
  let rightWeight = 0;
  for (const k of kids) {
    const w = weight(k);
    if (leftWeight <= rightWeight) {
      leftBranches.push(k);
      leftWeight += w;
    } else {
      rightBranches.push(k);
      rightWeight += w;
    }
  }

  const left = branchStack(leftBranches, collapsed, -1);
  const right = branchStack(rightBranches, collapsed, 1);
  const rootW = COL_W[0];
  const rootH = COL_H[0];
  const H = Math.max(left.height, right.height, rootH);
  const leftShiftY = (H - left.height) / 2;
  const rightShiftY = (H - right.height) / 2;
  const leftShiftX = -rootW / 2;
  const rightShiftX = rootW / 2 - COL_W[0];

  for (const n of left.nodes) {
    n.x += leftShiftX;
    n.y += leftShiftY;
  }
  for (const n of right.nodes) {
    n.x += rightShiftX;
    n.y += rightShiftY;
  }

  const rootNode: FlatNode = {
    ...root,
    x: -rootW / 2,
    y: H / 2 - rootH / 2,
    w: rootW,
    h: rootH,
  };

  const rawLinks: RawLink[] = [...left.links, ...right.links];
  const byId = new Map([...left.nodes, ...right.nodes].map((n) => [n.id, n]));
  for (const b of [...leftBranches, ...rightBranches]) {
    const node = byId.get(b.id);
    if (node) rawLinks.push({ from: rootNode, to: node, depth: node.depth, kind: "h" });
  }

  return finalize([rootNode, ...left.nodes, ...right.nodes], rawLinks, walkAll(root).length);
}

/* ----------------------------------------------------------------- org ---- */

const ORG_W = [232, 202, 180, 160];
const ORG_H = [78, 58, 52, 46];
const ORG_GAP_X = 26;
const ORG_GAP_Y = 62;

function orgLayout(root: TreeNode, collapsed: Set<string>): Layout {
  const widths = new Map<string, number>();
  const measure = (n: TreeNode): number => {
    const d = clampDepth(n.depth);
    const self = ORG_W[d];
    const kids = kidsOf(n, collapsed);
    if (!kids.length) {
      widths.set(n.id, self);
      return self;
    }
    let total = 0;
    kids.forEach((k, i) => {
      total += measure(k) + (i ? ORG_GAP_X : 0);
    });
    const span = Math.max(self, total);
    widths.set(n.id, span);
    return span;
  };
  measure(root);

  const levelY = [0, 0, 0, 0];
  for (let d = 1; d < 4; d++) levelY[d] = levelY[d - 1] + ORG_H[d - 1] + ORG_GAP_Y;

  const nodes: FlatNode[] = [];
  const rawLinks: RawLink[] = [];

  const place = (n: TreeNode, left: number): FlatNode => {
    const d = clampDepth(n.depth);
    const w = ORG_W[d];
    const h = ORG_H[d];
    const span = widths.get(n.id) ?? w;
    const node: FlatNode = {
      ...n,
      x: left + (span - w) / 2,
      y: levelY[d],
      w,
      h,
    };
    nodes.push(node);
    const kids = kidsOf(n, collapsed);
    let childSpan = 0;
    kids.forEach((k, i) => {
      childSpan += widths.get(k.id) ?? ORG_W[clampDepth(k.depth)];
      if (i) childSpan += ORG_GAP_X;
    });
    let cursor = left + (span - childSpan) / 2;
    for (const k of kids) {
      const child = place(k, cursor);
      rawLinks.push({ from: node, to: child, depth: child.depth, kind: "v" });
      cursor += (widths.get(k.id) ?? ORG_W[clampDepth(k.depth)]) + ORG_GAP_X;
    }
    return node;
  };

  place(root, 0);
  return finalize(nodes, rawLinks, walkAll(root).length);
}

/* -------------------------------------------------------------- radial ---- */

const RAD_W = [230, 180, 156, 142];
const RAD_H = [86, 58, 50, 44];
const RAD_R = [0, 380, 740, 1010];

function radialLayout(root: TreeNode, collapsed: Set<string>): Layout {
  const nodes: FlatNode[] = [];
  const rawLinks: RawLink[] = [];

  const leafWeight = (n: TreeNode): number => {
    const kids = kidsOf(n, collapsed);
    return kids.length ? kids.reduce((s, k) => s + leafWeight(k), 0) : 1;
  };

  const center = { x: 0, y: 0 };
  const placeRoot: FlatNode = {
    ...root,
    x: center.x - RAD_W[0] / 2,
    y: center.y - RAD_H[0] / 2,
    w: RAD_W[0],
    h: RAD_H[0],
  };
  nodes.push(placeRoot);

  const place = (n: TreeNode, parent: FlatNode, radius: number, a0: number, a1: number) => {
    const d = clampDepth(n.depth);
    const w = RAD_W[d];
    const h = RAD_H[d];
    const angle = (a0 + a1) / 2;
    const node: FlatNode = {
      ...n,
      x: center.x + Math.cos(angle) * radius - w / 2,
      y: center.y + Math.sin(angle) * radius - h / 2,
      w,
      h,
    };
    nodes.push(node);
    rawLinks.push({ from: parent, to: node, depth: node.depth, kind: "line" });

    const kids = kidsOf(n, collapsed);
    if (!kids.length || d >= 3) return;
    const weights = kids.map(leafWeight);
    const total = weights.reduce((s, x) => s + x, 0) || 1;
    let cursor = a0;
    kids.forEach((k, i) => {
      const span = ((a1 - a0) * weights[i]) / total;
      place(k, node, RAD_R[clampDepth(d) + 1] ?? RAD_R[3], cursor, cursor + span);
      cursor += span;
    });
  };

  const branches = kidsOf(root, collapsed);
  const weights = branches.map(leafWeight);
  const total = weights.reduce((s, x) => s + x, 0) || 1;
  let cursor = -Math.PI / 2;
  branches.forEach((b, i) => {
    const span = (Math.PI * 2 * weights[i]) / total;
    place(b, placeRoot, RAD_R[1], cursor, cursor + span);
    cursor += span;
  });

  return finalize(nodes, rawLinks, walkAll(root).length);
}

/* ------------------------------------------------------------ timeline ---- */

const TL_ROOT_W = 232;
const TL_BRANCH_W = 196;
const TL_CHILD_W = 172;
const TL_GRAND_W = 152;
const TL_H = [78, 58, 50, 44];
const TL_GAP = 30;

function timelineLayout(root: TreeNode, collapsed: Set<string>): Layout {
  const rootH = TL_H[0];
  const nodes: FlatNode[] = [
    { ...root, x: 0, y: -rootH / 2, w: TL_ROOT_W, h: rootH },
  ];
  const rawLinks: RawLink[] = [];

  let cursorX = TL_ROOT_W + 96;
  let previous: FlatNode = nodes[0];

  kidsOf(root, collapsed).forEach((branchNode, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const branchH = TL_H[1];
    const placedBranch: FlatNode = {
      ...branchNode,
      x: cursorX,
      y: -branchH / 2,
      w: TL_BRANCH_W,
      h: branchH,
    };
    nodes.push(placedBranch);
    rawLinks.push({ from: previous, to: placedBranch, depth: 1, kind: "line" });
    previous = placedBranch;

    const children = kidsOf(branchNode, collapsed);
    let maxX = placedBranch.x + placedBranch.w;
    const maxGrands = children.reduce((m, c) => Math.max(m, kidsOf(c, collapsed).length), 0);
    const grandSpread = Math.max(0, maxGrands - 1) * (TL_H[3] + 10);
    const childStep = TL_H[2] + 24 + grandSpread;
    const baseDistance = branchH / 2 + TL_GAP + grandSpread / 2 + TL_H[2] / 2;
    children.forEach((child, j) => {
      const childH = TL_H[2];
      const centerY = side * (baseDistance + j * childStep);
      const node: FlatNode = {
        ...child,
        x: cursorX,
        y: centerY - childH / 2,
        w: TL_CHILD_W,
        h: childH,
      };
      nodes.push(node);
      rawLinks.push({ from: placedBranch, to: node, depth: 2, kind: "v" });

      const grands = kidsOf(child, collapsed);
      grands.forEach((grand, k) => {
        const gh = TL_H[3];
        const gnode: FlatNode = {
          ...grand,
          x: node.x + TL_CHILD_W + 34,
          y: node.y + (k - (grands.length - 1) / 2) * (gh + 10),
          w: TL_GRAND_W,
          h: gh,
        };
        nodes.push(gnode);
        rawLinks.push({ from: node, to: gnode, depth: 3, kind: "h" });
        maxX = Math.max(maxX, gnode.x + gnode.w);
      });
      maxX = Math.max(maxX, node.x + node.w);
    });

    const column = Math.max(TL_BRANCH_W, TL_CHILD_W + (children.some((c) => kidsOf(c, collapsed).length) ? 34 + TL_GRAND_W : 0));
    cursorX += column + 104;
  });

  return finalize(nodes, rawLinks, walkAll(root).length);
}

/* ------------------------------------------------------------- outline ---- */

const OL_W = [248, 214, 188, 168];
const OL_H = [76, 54, 48, 44];
const OL_INDENT = 52;
const OL_GAP = 16;

function outlineLayout(root: TreeNode, collapsed: Set<string>): Layout {
  const heights = new Map<string, number>();
  const measure = (n: TreeNode): number => {
    const d = clampDepth(n.depth);
    const kids = kidsOf(n, collapsed);
    if (!kids.length) {
      heights.set(n.id, OL_H[d]);
      return OL_H[d];
    }
    let total = OL_H[d] + OL_GAP;
    kids.forEach((k, i) => {
      total += measure(k) + (i ? OL_GAP : 0);
    });
    heights.set(n.id, total);
    return total;
  };
  measure(root);

  const rightAt = [0, 0, 0, 0];
  for (let d = 0; d < 4; d++) rightAt[d] = OL_W[0] - d * OL_INDENT;

  const nodes: FlatNode[] = [];
  const rawLinks: RawLink[] = [];

  const place = (n: TreeNode, top: number): FlatNode => {
    const d = clampDepth(n.depth);
    const node: FlatNode = {
      ...n,
      x: rightAt[d] - OL_W[d],
      y: top,
      w: OL_W[d],
      h: OL_H[d],
    };
    nodes.push(node);
    const kids = kidsOf(n, collapsed);
    let cursor = top + OL_H[d] + OL_GAP;
    for (const k of kids) {
      const child = place(k, cursor);
      rawLinks.push({ from: node, to: child, depth: child.depth, kind: "v" });
      cursor += (heights.get(k.id) ?? OL_H[clampDepth(k.depth)]) + OL_GAP;
    }
    return node;
  };

  place(root, 0);
  return finalize(nodes, rawLinks, walkAll(root).length);
}

/* ------------------------------------------------------------ fishbone ---- */

const FB_ROOT_W = 220;
const FB_ROOT_H = 76;
const FB_BRANCH_W = 196;
const FB_BRANCH_H = 56;
const FB_CHILD_W = 172;
const FB_CHILD_H = 50;
const FB_GRAND_W = 150;
const FB_GRAND_H = 42;
const FB_GAP = 34;

function fishboneLayout(root: TreeNode, collapsed: Set<string>): Layout {
  const rootNode: FlatNode = {
    ...root,
    x: 0,
    y: -FB_ROOT_H / 2,
    w: FB_ROOT_W,
    h: FB_ROOT_H,
  };
  const nodes: FlatNode[] = [rootNode];
  const rawLinks: RawLink[] = [];

  const branches = kidsOf(root, collapsed);
  const extentOf = (branchNode: TreeNode) => {
    const children = kidsOf(branchNode, collapsed);
    const hasGrands = children.some((c) => kidsOf(c, collapsed).length > 0);
    return (
      90 +
      FB_BRANCH_W +
      (children.length ? 70 + FB_CHILD_W + (hasGrands ? 40 + FB_GRAND_W : 0) : 0)
    );
  };
  const maxExtent = branches.reduce((m, b) => Math.max(m, extentOf(b)), 0);
  const step = Math.max(200, (maxExtent + FB_GAP) / 2);

  branches.forEach((branchNode, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const attachX = FB_ROOT_W + 100 + i * step;
    const branch: FlatNode = {
      ...branchNode,
      x: attachX + 90,
      y: side * 130 - FB_BRANCH_H / 2,
      w: FB_BRANCH_W,
      h: FB_BRANCH_H,
    };
    nodes.push(branch);
    rawLinks.push({ from: rootNode, to: branch, depth: 1, kind: "fish" });

    const children = kidsOf(branchNode, collapsed);
    const maxGrands = children.reduce((m, c) => Math.max(m, kidsOf(c, collapsed).length), 0);
    const grandSpread = Math.max(0, maxGrands - 1) * (FB_GRAND_H + 8);
    const childStep = Math.max(64, grandSpread + 54);
    const base = 230 + grandSpread / 2;

    children.forEach((child, j) => {
      const childNode: FlatNode = {
        ...child,
        x: branch.x + FB_BRANCH_W + 70,
        y: side * (base + j * childStep) - FB_CHILD_H / 2,
        w: FB_CHILD_W,
        h: FB_CHILD_H,
      };
      nodes.push(childNode);
      rawLinks.push({ from: branch, to: childNode, depth: 2, kind: "line" });

      const grands = kidsOf(child, collapsed);
      grands.forEach((grand, k) => {
        const gnode: FlatNode = {
          ...grand,
          x: childNode.x + FB_CHILD_W + 40,
          y: childNode.y + (k - (grands.length - 1) / 2) * (FB_GRAND_H + 8),
          w: FB_GRAND_W,
          h: FB_GRAND_H,
        };
        nodes.push(gnode);
        rawLinks.push({ from: childNode, to: gnode, depth: 3, kind: "line" });
      });
    });
  });

  return finalize(nodes, rawLinks, walkAll(root).length);
}

/* ------------------------------------------------------------- columns ---- */

const MX_ROOT_W = 230;
const MX_ROOT_H = 76;
const MX_BRANCH_W = 196;
const MX_BRANCH_H = 54;
const MX_CHILD_W = 172;
const MX_CHILD_H = 48;
const MX_GRAND_W = 150;
const MX_GRAND_H = 42;
const MX_CELL_GAP = 26;
const MX_INNER = 22;
const MX_TOP_GAP = 74;

function columnsLayout(root: TreeNode, collapsed: Set<string>): Layout {
  const branches = kidsOf(root, collapsed);
  const cells = branches.map((branch) => {
    const children = kidsOf(branch, collapsed);
    let contentH = MX_BRANCH_H;
    let contentW = MX_BRANCH_W;
    const slots = children.map((child) => {
      const grands = kidsOf(child, collapsed);
      const spread = Math.max(0, (grands.length - 1) * (MX_GRAND_H + 8));
      const slotH = Math.max(MX_CHILD_H, spread + MX_GRAND_H) + 14;
      contentH += MX_INNER + slotH;
      contentW = Math.max(contentW, MX_CHILD_W + (grands.length ? 24 + MX_GRAND_W : 0));
      return { child, grands, spread, slotH };
    });
    return { branch, slots, contentH, contentW };
  });

  const anyContent = cells.some((c) => c.slots.length > 0);
  const pad = anyContent ? MX_INNER : 10;

  const cellW = Math.max(MX_BRANCH_W, ...cells.map((c) => c.contentW)) + pad * 2;
  const cellH = Math.max(MX_BRANCH_H, ...cells.map((c) => c.contentH)) + pad * 2;
  const gridW = cells.length * cellW + Math.max(0, cells.length - 1) * MX_CELL_GAP;
  const gridTop = MX_ROOT_H + MX_TOP_GAP;
  const rootNode: FlatNode = {
    ...root,
    x: (gridW - MX_ROOT_W) / 2,
    y: 0,
    w: MX_ROOT_W,
    h: MX_ROOT_H,
  };
  const nodes: FlatNode[] = [rootNode];
  const rawLinks: RawLink[] = [];

  cells.forEach((cell, i) => {
    const cellX = i * (cellW + MX_CELL_GAP);
    const branch: FlatNode = {
      ...cell.branch,
      x: cellX + (cellW - MX_BRANCH_W) / 2,
      y: gridTop + pad,
      w: MX_BRANCH_W,
      h: MX_BRANCH_H,
    };
    nodes.push(branch);
    rawLinks.push({ from: rootNode, to: branch, depth: 1, kind: "v" });

    let cursorY = branch.y + MX_BRANCH_H + pad;
    cell.slots.forEach(({ child, grands, spread, slotH }) => {
      const childNode: FlatNode = {
        ...child,
        x: cellX + pad,
        y: cursorY,
        w: MX_CHILD_W,
        h: MX_CHILD_H,
      };
      nodes.push(childNode);
      rawLinks.push({ from: branch, to: childNode, depth: 2, kind: "v" });

      const firstGrandY = childNode.y + (MX_CHILD_H - MX_GRAND_H) / 2 - spread / 2;
      grands.forEach((grand, k) => {
        const gnode: FlatNode = {
          ...grand,
          x: childNode.x + MX_CHILD_W + 24,
          y: firstGrandY + k * (MX_GRAND_H + 8),
          w: MX_GRAND_W,
          h: MX_GRAND_H,
        };
        nodes.push(gnode);
        rawLinks.push({ from: childNode, to: gnode, depth: 3, kind: "h" });
      });

      cursorY += slotH;
    });
  });

  return finalize(nodes, rawLinks, walkAll(root).length);
}

/* --------------------------------------------------------------- lanes ---- */

const LN_ROOT_W = 232;
const LN_ROOT_H = 78;
const LN_BRANCH_W = 196;
const LN_BRANCH_H = 56;
const LN_CHILD_W = 176;
const LN_CHILD_H = 50;
const LN_GRAND_W = 152;
const LN_GRAND_H = 42;
const LN_CHILD_GAP = 22;
const LN_LANE_GAP = 34;
const LN_ROOT_GAP = 110;

function lanesLayout(root: TreeNode, collapsed: Set<string>): Layout {
  const lanes = kidsOf(root, collapsed).map((branch) => {
    const rows = kidsOf(branch, collapsed).map((child) => {
      const grands = kidsOf(child, collapsed);
      const grandH = grands.length
        ? 12 + grands.length * LN_GRAND_H + (grands.length - 1) * 8
        : 0;
      return { child, grands, blockH: LN_CHILD_H + grandH };
    });
    const contentH = rows.reduce((m, row) => Math.max(m, row.blockH), 0);
    return { branch, rows, laneH: Math.max(LN_BRANCH_H, contentH) };
  });

  const nodes: FlatNode[] = [];
  const rawLinks: RawLink[] = [];
  const branchNodes: FlatNode[] = [];
  let laneTop = 0;

  for (const lane of lanes) {
    const branchNode: FlatNode = {
      ...lane.branch,
      x: 0,
      y: laneTop + (lane.laneH - LN_BRANCH_H) / 2,
      w: LN_BRANCH_W,
      h: LN_BRANCH_H,
    };
    nodes.push(branchNode);
    branchNodes.push(branchNode);

    lane.rows.forEach((row, j) => {
      const blockTop = laneTop + (lane.laneH - row.blockH) / 2;
      const childNode: FlatNode = {
        ...row.child,
        x: -(LN_CHILD_GAP + (j + 1) * LN_CHILD_W + j * 18),
        y: blockTop,
        w: LN_CHILD_W,
        h: LN_CHILD_H,
      };
      nodes.push(childNode);
      rawLinks.push({ from: branchNode, to: childNode, depth: childNode.depth, kind: "h" });

      row.grands.forEach((grand, k) => {
        const grandNode: FlatNode = {
          ...grand,
          x: childNode.x + (LN_CHILD_W - LN_GRAND_W) / 2,
          y: blockTop + LN_CHILD_H + 12 + k * (LN_GRAND_H + 8),
          w: LN_GRAND_W,
          h: LN_GRAND_H,
        };
        nodes.push(grandNode);
        rawLinks.push({ from: childNode, to: grandNode, depth: grandNode.depth, kind: "v" });
      });
    });

    laneTop += lane.laneH + LN_LANE_GAP;
  }

  const totalH = Math.max(LN_BRANCH_H, laneTop ? laneTop - LN_LANE_GAP : LN_BRANCH_H);
  const rootNode: FlatNode = {
    ...root,
    x: LN_BRANCH_W + LN_ROOT_GAP,
    y: (totalH - LN_ROOT_H) / 2,
    w: LN_ROOT_W,
    h: LN_ROOT_H,
  };
  nodes.push(rootNode);
  for (const branchNode of branchNodes) {
    rawLinks.push({ from: rootNode, to: branchNode, depth: branchNode.depth, kind: "h" });
  }

  return finalize(nodes, rawLinks, walkAll(root).length);
}

/* ------------------------------------------------------- panel helpers ---- */

type PanelDims = {
  branchW: number;
  branchH: number;
  childW: number;
  childH: number;
  grandW: number;
  grandH: number;
  pad: number;
};

type PanelRow = {
  child: TreeNode;
  grands: TreeNode[];
  grandStackH: number;
  rowH: number;
};

type Panel = {
  branch: TreeNode;
  rows: PanelRow[];
  contentW: number;
  contentH: number;
  cellW: number;
  cellH: number;
};

function buildPanel(branch: TreeNode, collapsed: Set<string>, d: PanelDims): Panel {
  const rows: PanelRow[] = kidsOf(branch, collapsed).map((child) => {
    const grands = kidsOf(child, collapsed);
    const grandStackH = grands.length
      ? grands.length * d.grandH + (grands.length - 1) * 8
      : 0;
    return { child, grands, grandStackH, rowH: Math.max(d.childH, grandStackH) };
  });
  const hasGrand = rows.some((row) => row.grands.length > 0);
  const contentW = Math.max(
    d.branchW,
    rows.length ? d.childW + (hasGrand ? 26 + d.grandW : 0) : 0,
  );
  const contentH =
    d.branchH +
    (rows.length
      ? 22 + rows.reduce((sum, row) => sum + row.rowH, 0) + (rows.length - 1) * 14
      : 0);
  return {
    branch,
    rows,
    contentW,
    contentH,
    cellW: contentW + d.pad * 2,
    cellH: contentH + d.pad * 2,
  };
}

function placePanelBody(
  panel: Panel,
  branchNode: FlatNode,
  contentX: number,
  d: PanelDims,
  nodes: FlatNode[],
  rawLinks: RawLink[],
) {
  let rowTop = branchNode.y + d.branchH + 22;
  for (const row of panel.rows) {
    const childNode: FlatNode = {
      ...row.child,
      x: contentX,
      y: rowTop + (row.rowH - d.childH) / 2,
      w: d.childW,
      h: d.childH,
    };
    nodes.push(childNode);
    rawLinks.push({ from: branchNode, to: childNode, depth: childNode.depth, kind: "v" });

    const grandTop = rowTop + (row.rowH - row.grandStackH) / 2;
    row.grands.forEach((grand, k) => {
      const grandNode: FlatNode = {
        ...grand,
        x: contentX + d.childW + 26,
        y: grandTop + k * (d.grandH + 8),
        w: d.grandW,
        h: d.grandH,
      };
      nodes.push(grandNode);
      rawLinks.push({ from: childNode, to: grandNode, depth: grandNode.depth, kind: "h" });
    });
    rowTop += row.rowH + 14;
  }
}

/* ----------------------------------------------------------------- arc ---- */

const AR_ROOT_W = 232;
const AR_ROOT_H = 78;
const AR_ROOT_GAP = 150;
const AR_ARC_AMP = 110;
const AR_DIMS: PanelDims = {
  branchW: 196,
  branchH: 56,
  childW: 172,
  childH: 48,
  grandW: 150,
  grandH: 42,
  pad: 22,
};

function arcLayout(root: TreeNode, collapsed: Set<string>): Layout {
  const panels = kidsOf(root, collapsed).map((branch) => buildPanel(branch, collapsed, AR_DIMS));
  if (!panels.length) {
    const only: FlatNode = { ...root, x: 0, y: 0, w: AR_ROOT_W, h: AR_ROOT_H };
    return finalize([only], [], walkAll(root).length);
  }

  const cellW = Math.max(...panels.map((panel) => panel.cellW));
  const count = panels.length;
  const gridW = cellW * count;
  const mid = (count - 1) / 2;
  const arcTop = AR_ROOT_H + AR_ROOT_GAP;
  const nodes: FlatNode[] = [];
  const rawLinks: RawLink[] = [];
  const rootNode: FlatNode = {
    ...root,
    x: (gridW - AR_ROOT_W) / 2,
    y: 0,
    w: AR_ROOT_W,
    h: AR_ROOT_H,
  };
  nodes.push(rootNode);

  panels.forEach((panel, i) => {
    const dx = mid ? (i - mid) / mid : 0;
    const curve = 1 - dx * dx;
    const cellX = (count - 1 - i) * cellW;
    const branchNode: FlatNode = {
      ...panel.branch,
      x: cellX + (cellW - AR_DIMS.branchW) / 2,
      y: arcTop + AR_ARC_AMP * curve,
      w: AR_DIMS.branchW,
      h: AR_DIMS.branchH,
    };
    nodes.push(branchNode);
    rawLinks.push({ from: rootNode, to: branchNode, depth: branchNode.depth, kind: "line" });

    const contentX = cellX + (cellW - panel.contentW) / 2;
    placePanelBody(panel, branchNode, contentX, AR_DIMS, nodes, rawLinks);
  });

  return finalize(nodes, rawLinks, walkAll(root).length);
}

/* -------------------------------------------------------------- matrix ---- */

const MT_ROOT_W = 232;
const MT_ROOT_H = 78;
const MT_COLS = 2;
const MT_GAP_X = 28;
const MT_GAP_Y = 30;
const MT_GRID_GAP = 86;
const MT_DIMS: PanelDims = {
  branchW: 196,
  branchH: 54,
  childW: 172,
  childH: 48,
  grandW: 150,
  grandH: 42,
  pad: 20,
};

function matrixLayout(root: TreeNode, collapsed: Set<string>): Layout {
  const panels = kidsOf(root, collapsed).map((branch) => buildPanel(branch, collapsed, MT_DIMS));
  if (!panels.length) {
    const only: FlatNode = { ...root, x: 0, y: 0, w: MT_ROOT_W, h: MT_ROOT_H };
    return finalize([only], [], walkAll(root).length);
  }

  const cellW = Math.max(...panels.map((panel) => panel.cellW));
  const rowCount = Math.ceil(panels.length / MT_COLS);
  const rowHeights: number[] = [];
  for (let r = 0; r < rowCount; r++) {
    rowHeights.push(
      Math.max(...panels.slice(r * MT_COLS, (r + 1) * MT_COLS).map((panel) => panel.cellH)),
    );
  }
  const gridW = MT_COLS * cellW + (MT_COLS - 1) * MT_GAP_X;
  const gridTop = MT_ROOT_H + MT_GRID_GAP;
  const nodes: FlatNode[] = [];
  const rawLinks: RawLink[] = [];
  const rootNode: FlatNode = {
    ...root,
    x: (gridW - MT_ROOT_W) / 2,
    y: 0,
    w: MT_ROOT_W,
    h: MT_ROOT_H,
  };
  nodes.push(rootNode);

  let rowTop = gridTop;
  for (let r = 0; r < rowCount; r++) {
    const rowPanels = panels.slice(r * MT_COLS, (r + 1) * MT_COLS);
    rowPanels.forEach((panel, idx) => {
      const cellX =
        rowPanels.length === 1
          ? (gridW - cellW) / 2
          : (MT_COLS - 1 - idx) * (cellW + MT_GAP_X);
      const branchNode: FlatNode = {
        ...panel.branch,
        x: cellX + (cellW - MT_DIMS.branchW) / 2,
        y: rowTop + MT_DIMS.pad,
        w: MT_DIMS.branchW,
        h: MT_DIMS.branchH,
      };
      nodes.push(branchNode);
      rawLinks.push({ from: rootNode, to: branchNode, depth: branchNode.depth, kind: "v" });

      const contentX = cellX + (cellW - panel.contentW) / 2;
      placePanelBody(panel, branchNode, contentX, MT_DIMS, nodes, rawLinks);
    });
    rowTop += rowHeights[r] + MT_GAP_Y;
  }

  return finalize(nodes, rawLinks, walkAll(root).length);
}

/* -------------------------------------------------------------- stairs ---- */

const ST_ROOT_W = 232;
const ST_ROOT_H = 78;
const ST_GAP_X = 40;
const ST_STEP_Y = 150;
const ST_ROOT_GAP = 42;
const ST_DIMS: PanelDims = {
  branchW: 196,
  branchH: 54,
  childW: 172,
  childH: 48,
  grandW: 150,
  grandH: 42,
  pad: 20,
};

function stairsLayout(root: TreeNode, collapsed: Set<string>): Layout {
  const panels = kidsOf(root, collapsed).map((branch) => buildPanel(branch, collapsed, ST_DIMS));
  if (!panels.length) {
    const only: FlatNode = { ...root, x: 0, y: 0, w: ST_ROOT_W, h: ST_ROOT_H };
    return finalize([only], [], walkAll(root).length);
  }

  const cellW = Math.max(...panels.map((panel) => panel.cellW));
  const stepX = cellW + ST_GAP_X;
  const count = panels.length;
  const nodes: FlatNode[] = [];
  const rawLinks: RawLink[] = [];
  const branchNodes: FlatNode[] = [];

  panels.forEach((panel, i) => {
    const slot = count - 1 - i;
    const cellX = slot * stepX;
    const cellY = slot * ST_STEP_Y;
    const branchNode: FlatNode = {
      ...panel.branch,
      x: cellX + (cellW - ST_DIMS.branchW) / 2,
      y: cellY + ST_DIMS.pad,
      w: ST_DIMS.branchW,
      h: ST_DIMS.branchH,
    };
    nodes.push(branchNode);
    branchNodes.push(branchNode);
    placePanelBody(
      panel,
      branchNode,
      cellX + (cellW - panel.contentW) / 2,
      ST_DIMS,
      nodes,
      rawLinks,
    );
  });

  for (let i = 1; i < branchNodes.length; i++) {
    rawLinks.push({
      from: branchNodes[i - 1],
      to: branchNodes[i],
      depth: branchNodes[i].depth,
      kind: "h",
    });
  }

  const rootNode: FlatNode = {
    ...root,
    x: (count - 1) * stepX + cellW + ST_ROOT_GAP,
    y: branchNodes[0].y + (ST_DIMS.branchH - ST_ROOT_H) / 2,
    w: ST_ROOT_W,
    h: ST_ROOT_H,
  };
  nodes.push(rootNode);
  rawLinks.push({ from: rootNode, to: branchNodes[0], depth: branchNodes[0].depth, kind: "h" });

  return finalize(nodes, rawLinks, walkAll(root).length);
}

/* --------------------------------------------------------------- entry ---- */

export function layoutMindMap(
  root: TreeNode,
  template: MindMapTemplate,
  collapsed: Set<string>,
  direction: TextDirection = "rtl",
): Layout {
  switch (template) {
    case "balanced":
      return balancedLayout(root, collapsed);
    case "org":
      return orgLayout(root, collapsed);
    case "radial":
      return radialLayout(root, collapsed);
    case "arc":
      return arcLayout(root, collapsed);
    case "timeline":
      return timelineLayout(root, collapsed);
    case "stairs":
      return stairsLayout(root, collapsed);
    case "outline":
      return outlineLayout(root, collapsed);
    case "fishbone":
      return fishboneLayout(root, collapsed);
    case "columns":
      return columnsLayout(root, collapsed);
    case "lanes":
      return lanesLayout(root, collapsed);
    case "matrix":
      return matrixLayout(root, collapsed);
    default:
      return horizontalLayout(root, collapsed, direction === "ltr" ? 1 : -1);
  }
}
