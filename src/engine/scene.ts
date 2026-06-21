import type { PlacementRule } from "../wfml-core/ast";

export type ViewerNode = {
  kind: string;
  id: string;
  x?: number;
  y?: number;
  w?: number | "fill" | "hug" | "auto";
  h?: number | "fill" | "hug" | "auto";
  text?: string;
  src?: string;
  style?: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    corner?: number;
    text?: { size?: number; weight?: number; align?: "left" | "center" | "right" };
  };
  place?: PlacementRule[];
  direction?: "row" | "column";
  gap?: number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  padding?: number;
  children?: ViewerNode[];
};

export type ViewerDoc = { children: ViewerNode[] };

export function findNodeById(nodes: ViewerNode[], id: string | null): ViewerNode | null {
  if (!id) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNodeById(node.children || [], id);
    if (child) return child;
  }
  return null;
}

export function mapDoc(astDoc: any): ViewerDoc {
  const mapNode = (n: any): ViewerNode => {
    const mapped: ViewerNode = {
      kind: n.kind,
      id: n.id,
      x: n.x,
      y: n.y,
      w: n.w,
      h: n.h,
      text: n.text,
      src: n.src,
      style: {
        fill: n.style?.fill,
        stroke: n.style?.stroke,
        strokeWidth: n.style?.strokeWidth,
        corner: n.style?.corner,
        text: n.style?.text,
      },
      place: n.place as PlacementRule[] | undefined,
    };
    if (n.direction) mapped.direction = n.direction;
    if (n.gap !== undefined) mapped.gap = n.gap;
    if (n.align) mapped.align = n.align;
    if (n.justify) mapped.justify = n.justify;
    if (n.padding !== undefined) mapped.padding = n.padding;
    if (n.children) mapped.children = n.children.map(mapNode);
    return mapped;
  };

  if (Array.isArray(astDoc?.children)) {
    return { children: astDoc.children.map(mapNode) };
  }

  const fallbackChildren = (astDoc?.pages || []).flatMap((p: any) => p.frames || []);
  return { children: fallbackChildren.map(mapNode) };
}
