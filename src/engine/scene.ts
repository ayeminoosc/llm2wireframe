import type { PlacementRule } from "../wfml-core/ast";
import { expandComponentInstance } from "./components";
import type { PropSpec } from "../wfml-core/ast";

export type ViewerNode = {
  kind: string;
  id: string;
  x?: number;
  y?: number;
  w?: number | "fill" | "hug" | "auto";
  h?: number | "fill" | "hug" | "auto";
  rotation?: number;
  text?: string;
  points?: [number, number][];
  src?: string;
  from?: { ref: string; anchor?: "center" | "top" | "bottom" | "left" | "right" | "auto" };
  to?: { ref: string; anchor?: "center" | "top" | "bottom" | "left" | "right" | "auto" };
  startHead?: string;
  endHead?: string;
  route?: string;
  style?: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    strokeStyle?: "solid" | "dashed" | "dotted";
    roughness?: number;
    edges?: "sharp" | "round";
    corner?: number;
    text?: { size?: number; weight?: number; color?: string; opacity?: number; font?: string; align?: "left" | "center" | "right" };
  };
  place?: PlacementRule[];
  direction?: "row" | "column";
  gap?: number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  padding?: number;
  semantic?: {
    role?: string;
    inferred?: boolean;
    confidence?: number;
  };
  componentName?: string;
  componentId?: string;
  componentProps?: Record<string, PropSpec>;
  overrides?: Record<string, any>;
  isInstanceRoot?: boolean;
  instanceRootId?: string;
  children?: ViewerNode[];
};

export type ViewerDoc = { children: ViewerNode[] };

export type SceneBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

export function findNodeById(nodes: ViewerNode[], id: string | null): ViewerNode | null {
  if (!id) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNodeById(node.children || [], id);
    if (child) return child;
  }
  return null;
}

export function getSceneBounds(nodes: ViewerNode[]): SceneBounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const visit = (list: ViewerNode[]) => {
    for (const node of list) {
      const x = Number(node.x ?? 0);
      const y = Number(node.y ?? 0);
      const w = Number(node.w ?? 0);
      const h = Number(node.h ?? 0);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
      if (node.children?.length) visit(node.children);
    }
  };

  if (!nodes.length) return null;
  visit(nodes);
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export function mapDoc(astDoc: any): ViewerDoc {
  const mapNode = (n: any): ViewerNode => {
    if (n.kind === "instance") {
      const expanded = expandComponentInstance(astDoc, n);
      if (expanded) return mapNode(expanded);
    }

    const mapped: ViewerNode = {
      kind: n.kind,
      id: n.id,
      x: n.x,
      y: n.y,
      w: n.w,
      h: n.h,
      rotation: n.rotation,
      text: n.text,
      points: n.points,
      src: n.src,
      from: n.from,
      to: n.to,
      startHead: n.startHead,
      endHead: n.endHead,
      route: n.route,
      style: {
        fill: n.style?.fill,
        stroke: n.style?.stroke,
        strokeWidth: n.style?.strokeWidth,
        strokeStyle: n.style?.strokeStyle,
        roughness: n.style?.roughness,
        edges: n.style?.edges,
        corner: n.style?.corner,
        text: n.style?.text,
      },
      place: n.place as PlacementRule[] | undefined,
      semantic: n.semantic,
      componentName: n.componentName,
      componentId: n.componentId,
      componentProps: n.componentProps,
      overrides: n.overrides,
      isInstanceRoot: n.isInstanceRoot,
      instanceRootId: n.instanceRootId,
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
