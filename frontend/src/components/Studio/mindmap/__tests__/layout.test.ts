import { describe, expect, it } from "vitest";
import {
  MINDMAP_TEMPLATES,
  layoutMindMap,
  normalizeTemplate,
  walkAll,
  type TreeNode,
} from "../layout";

type RawNode = { label: string; children?: RawNode[] };

function buildTree(raw: RawNode): TreeNode {
  let seq = 0;
  const walk = (node: RawNode, depth: number): TreeNode => {
    const id = `n-${seq++}`;
    return {
      id,
      label: node.label,
      depth,
      children: (node.children ?? []).map((child) => walk(child, depth + 1)),
    };
  };
  return walk(raw, 0);
}

const raw: RawNode = {
  label: "المشتقات وتطبيقاتها",
  children: [
    {
      label: "المفهوم والاشتقاق",
      children: [
        { label: "تعريف المشتقة", children: [{ label: "الميل اللحظي" }, { label: "الحد والنهاية" }] },
        { label: "قابلية الاشتقاق", children: [{ label: "الاتصال الضروري" }, { label: "الزوايا الحادة" }] },
      ],
    },
    {
      label: "قواعد الاشتقاق",
      children: [
        { label: "الجمع والضرب", children: [{ label: "قاعدة الضرب" }, { label: "قاعدة القسمة" }] },
        { label: "السلسلة والتركيب" },
        { label: "الدوال المثلثية" },
        { label: "الدوال الأسية" },
      ],
    },
    {
      label: "تطبيقات هندسية",
      children: [
        { label: "المماس والعمودي", children: [{ label: "معادلة المماس" }, { label: "المماس الأفقي" }] },
        { label: "الرتابة والتقعر" },
        { label: "نقاط الانعطاف" },
      ],
    },
    {
      label: "تطبيقات فيزيائية",
      children: [
        { label: "السرعة والتسارع" },
        { label: "معدلات التغير" },
        { label: "الحركة المستقيمة" },
      ],
    },
    {
      label: "التقريب والتحليل",
      children: [
        { label: "التفاضل التقريبي", children: [{ label: "الخطية" }, { label: "الخطأ" }] },
        { label: "دراسة الدوال" },
        { label: "القيم القصوى" },
      ],
    },
    {
      label: "تمارين وأمثلة",
      children: [
        { label: "أمثلة محلولة" },
        { label: "تمارين تطبيقية" },
        { label: "مسائل مركبة" },
      ],
    },
    {
      label: "أخطاء شائعة",
      children: [
        { label: "إهمال المجال" },
        { label: "الخلط بين المشتقة والنهاية" },
        { label: "إسقاط القيمة المطلقة" },
      ],
    },
  ],
};

const tree = buildTree(raw);
const total = walkAll(tree).length;
const collapsed = new Set(tree.children.map((branch) => branch.id));

function overlaps(nodes: { x: number; y: number; w: number; h: number }[]) {
  const hits: string[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (
        a.x < b.x + b.w - 0.5 &&
        a.x + a.w > b.x + 0.5 &&
        a.y < b.y + b.h - 0.5 &&
        a.y + a.h > b.y + 0.5
      ) {
        hits.push(`${i}:${j}`);
      }
    }
  }
  return hits;
}

describe("mind map layouts", () => {
  it("offers twelve distinct templates", () => {
    expect(MINDMAP_TEMPLATES).toHaveLength(12);
    expect(new Set(MINDMAP_TEMPLATES.map((template) => template.id)).size).toBe(12);
    expect(normalizeTemplate("matrix")).toBe("matrix");
    expect(normalizeTemplate("lanes")).toBe("lanes");
    expect(normalizeTemplate("unknown-template")).toBe("tree");
  });

  for (const template of MINDMAP_TEMPLATES) {
    it(`${template.id} stays readable when expanded and collapsed`, () => {
      for (const [state, hidden] of [
        ["expanded", new Set<string>()],
        ["collapsed", collapsed],
      ] as const) {
        const layout = layoutMindMap(tree, template.id, hidden);
        expect(layout.W).toBeGreaterThan(0);
        expect(layout.H).toBeGreaterThan(0);
        expect(layout.total).toBe(total);
        expect(layout.visible).toBe(state === "expanded" ? total : tree.children.length + 1);
        expect(overlaps(layout.nodes)).toEqual([]);
        expect(
          layout.nodes.filter(
            (node) =>
              node.x < 0 ||
              node.y < 0 ||
              node.x + node.w > layout.W ||
              node.y + node.h > layout.H,
          ),
        ).toEqual([]);
      }
    });
  }
});