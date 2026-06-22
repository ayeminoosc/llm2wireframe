import type { ViewerDoc, ViewerNode } from "./scene";

export function layoutDoc(doc: ViewerDoc): ViewerDoc {
  const next: ViewerDoc = JSON.parse(JSON.stringify(doc));
  const rootW = typeof window !== "undefined" ? window.innerWidth : 1920;
  const rootH = typeof window !== "undefined" ? window.innerHeight : 1080;

  const resolvePlace = (
    node: ViewerNode,
    siblings: ViewerNode[],
    parentW: number,
    parentH: number,
    parentX = 0,
    parentY = 0,
    parentNode?: ViewerNode,
  ) => {
    const idx = Object.fromEntries(siblings.map((n) => [n.id, n]));
    const getRefNode = (ref?: string) => {
      if (!ref) return undefined;
      if (parentNode && ref === parentNode.id) return parentNode;
      return idx[ref];
    };
    if (!node.place) return;
    for (const r of node.place) {
      if (r.type === "centered") {
        const ref = getRefNode(r.ref);
        const bx = ref ? (ref.x || 0) : parentX;
        const by = ref ? (ref.y || 0) : parentY;
        const bw = ref ? (Number(ref.w) || parentW) : parentW;
        const bh = ref ? (Number(ref.h) || parentH) : parentH;
        node.x = bx + (bw - (Number(node.w) || 0)) / 2;
        node.y = by + (bh - (Number(node.h) || 0)) / 2;
        continue;
      }
      if (r.type === "centerX") {
        const ref = getRefNode(r.ref);
        const bx = ref ? (ref.x || 0) : parentX;
        const bw = ref ? (Number(ref.w) || parentW) : parentW;
        node.x = bx + (bw - (Number(node.w) || 0)) / 2;
        continue;
      }
      if (r.type === "centerY") {
        const ref = getRefNode(r.ref);
        const by = ref ? (ref.y || 0) : parentY;
        const bh = ref ? (Number(ref.h) || parentH) : parentH;
        node.y = by + (bh - (Number(node.h) || 0)) / 2;
        continue;
      }
      if (r.type === "below") {
        const ref = getRefNode(r.ref);
        if (ref) node.y = (ref.y || 0) + (Number(ref.h) || 0) + (r.by || 0);
        continue;
      }
      if (r.type === "above") {
        const ref = getRefNode(r.ref);
        if (ref) node.y = (ref.y || 0) - (Number(node.h) || 0) - (r.by || 0);
        continue;
      }
      if (r.type === "rightOf") {
        const ref = getRefNode(r.ref);
        if (ref) node.x = (ref.x || 0) + (Number(ref.w) || 0) + (r.by || 0);
        continue;
      }
      if (r.type === "leftOf") {
        const ref = getRefNode(r.ref);
        if (ref) node.x = (ref.x || 0) - (Number(node.w) || 0) - (r.by || 0);
        continue;
      }
      if (r.type === "inside") {
        const ref = getRefNode(r.ref);
        const inset = r.inset;
        const t = Array.isArray(inset) ? inset : inset !== undefined ? [inset, inset, inset, inset] : [0, 0, 0, 0];
        const bx = ref ? (ref.x || 0) : parentX;
        const by = ref ? (ref.y || 0) : parentY;
        const bw = ref ? (Number(ref.w) || parentW) : parentW;
        const bh = ref ? (Number(ref.h) || parentH) : parentH;
        node.x = Math.max(bx + t[3], Math.min(node.x ?? bx + t[3], bx + bw - (Number(node.w) || 0) - t[1]));
        node.y = Math.max(by + t[0], Math.min(node.y ?? by + t[0], by + bh - (Number(node.h) || 0) - t[2]));
        continue;
      }
      if (r.type === "alignLeft") {
        const ref = getRefNode(r.ref);
        if (ref) node.x = ref.x || 0;
        continue;
      }
      if (r.type === "alignRight") {
        const ref = getRefNode(r.ref);
        if (ref) node.x = (ref.x || 0) + (Number(ref.w) || 0) - (Number(node.w) || 0);
        continue;
      }
      if (r.type === "alignTop") {
        const ref = getRefNode(r.ref);
        if (ref) node.y = ref.y || 0;
        continue;
      }
      if (r.type === "alignBottom") {
        const ref = getRefNode(r.ref);
        if (ref) node.y = (ref.y || 0) + (Number(ref.h) || 0) - (Number(node.h) || 0);
      }
    }
  };

  const layoutNode = (node: ViewerNode, siblings: ViewerNode[], parentX: number, parentY: number, parentW: number, parentH: number, parentNode?: ViewerNode) => {
    if (node.kind === "text") {
      const size = node.style?.text?.size ?? 14;
      node.w = node.w ?? Math.max(80, (node.text?.length || 1) * (size * 0.6) + 16);
      node.h = node.h ?? size * 1.6;
    } else if (node.kind === "image") {
      node.w = node.w ?? 64;
      node.h = node.h ?? 64;
    } else if (node.kind === "rect" || node.kind === "flex" || node.kind === "ellipse" || node.kind === "diamond" || node.kind === "sticky") {
      if (node.w === "fill") node.w = parentW;
      if (node.h === "fill") node.h = parentH;
      node.w = node.w ?? (node.kind === "flex" ? parentW : 100);
      node.h = node.h ?? (node.kind === "flex" ? "hug" : node.kind === "sticky" ? 100 : 40);
    } else if (node.kind === "line") {
      node.w = node.w ?? 100;
      node.h = node.h ?? 2;
    }

    resolvePlace(node, siblings, parentW, parentH, parentX, parentY, parentNode);

    if (node.x === undefined) node.x = parentX + 16;
    if (node.y === undefined) node.y = parentY + 16;

    if (!node.children) return;

    if (node.kind === "flex") {
      const isCol = node.direction !== "row";
      const gap = node.gap || 0;
      const pad = node.padding || 0;
      let cx = node.x + pad;
      let cy = node.y + pad;
      let maxChildW = 0;
      let maxChildH = 0;

      for (const child of node.children) {
        if (!child.place || child.place.length === 0) {
          child.x = cx;
          child.y = cy;
        }

        const availableW = Number.isFinite(Number(node.w)) ? Number(node.w) : parentW;
        const availableH = Number.isFinite(Number(node.h)) ? Number(node.h) : parentH;
        layoutNode(child, node.children, child.x ?? cx, child.y ?? cy, Math.max(0, availableW - pad * 2), Math.max(0, availableH), node);

        if (!child.place || child.place.length === 0) {
          if (isCol) {
            cy += (Number(child.h) || 0) + gap;
          } else {
            cx += (Number(child.w) || 0) + gap;
          }
        }
        maxChildW = Math.max(maxChildW, ((child.x ?? node.x) - node.x) + (Number(child.w) || 0));
        maxChildH = Math.max(maxChildH, ((child.y ?? node.y) - node.y) + (Number(child.h) || 0));
      }

      if (node.w === "hug" || node.w === undefined) node.w = maxChildW + pad;
      if (node.h === "hug" || node.h === undefined) node.h = maxChildH + pad;
      return;
    }

    for (const child of node.children) {
      layoutNode(child, node.children, node.x, node.y, Number(node.w), Number(node.h), node);
    }
  };

  for (const node of next.children || []) {
    layoutNode(node, next.children || [], 0, 0, rootW, rootH);
  }

  return next;
}
