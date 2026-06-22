import { emitWFML, parseWFML } from "../parser/wfml-grammar-parser-emitter";
import { inferDocumentSemantics } from "./inference";
import type { ViewerDoc, ViewerNode } from "./scene";

type NodeContext<T extends { id: string; children?: any[] }> = {
  node: T;
  parent: T | null;
  siblings: T[];
};

function setDeepValue(obj: any, path: string, value: any) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!cur[key] || typeof cur[key] !== "object") cur[key] = {};
    cur = cur[key];
  }
  cur[parts[parts.length - 1]] = value;
}

function cloneNode(node: any): any {
  return JSON.parse(JSON.stringify(node));
}

function slug(s: string) {
  return String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function uniquifyId(baseId: string, used: Set<string>) {
  if (!used.has(baseId)) {
    used.add(baseId);
    return baseId;
  }
  let i = 2;
  while (used.has(`${baseId}-${i}`)) i++;
  const id = `${baseId}-${i}`;
  used.add(id);
  return id;
}

function collectIds(nodes: any[], used = new Set<string>()) {
  for (const node of nodes) {
    if (node.id) used.add(String(node.id));
    if (node.children) collectIds(node.children, used);
  }
  return used;
}

function collectComponentIds(components: any[] | undefined, used = new Set<string>()) {
  for (const component of components || []) {
    if (component.id) used.add(String(component.id));
  }
  return used;
}

function rekeySubtree(node: any, used: Set<string>) {
  node.id = uniquifyId(slug(node.id || node.kind || "node"), used);
  node.name = node.name ? `${node.name} Copy` : node.name;
  node.x = (node.x || 0) + 24;
  node.y = (node.y || 0) + 24;
  if (node.children) {
    for (const child of node.children) rekeySubtree(child, used);
  }
}

function shiftViewerSubtree(node: ViewerNode, shiftX: number, shiftY: number) {
  node.x = (node.x || 0) + shiftX;
  node.y = (node.y || 0) + shiftY;
  for (const child of node.children || []) shiftViewerSubtree(child, shiftX, shiftY);
}

function updateViewerNode(nodes: ViewerNode[], id: string, dx: number, dy: number): boolean {
  for (const n of nodes) {
    if (n.id === id) {
      shiftViewerSubtree(n, dx, dy);
      n.place = [];
      return true;
    }
    if (n.children && updateViewerNode(n.children, id, dx, dy)) return true;
  }
  return false;
}

function shiftAstSubtree(node: any, shiftX: number, shiftY: number) {
  node.x = (node.x || 0) + shiftX;
  node.y = (node.y || 0) + shiftY;
  for (const child of node.children || []) shiftAstSubtree(child, shiftX, shiftY);
}

function updateAstNode(nodes: any[], id: string, dx: number, dy: number): boolean {
  for (const n of nodes) {
    if (n.id === id) {
      shiftAstSubtree(n, Math.round(dx), Math.round(dy));
      n.place = undefined;
      return true;
    }
    if (n.children && updateAstNode(n.children, id, dx, dy)) return true;
  }
  return false;
}

function findNodeContext<T extends { id: string; children?: any[] }>(nodes: T[], id: string, parent: T | null = null): NodeContext<T> | null {
  for (const node of nodes) {
    if (node.id === id) return { node, parent, siblings: nodes };
    if (node.children) {
      const found = findNodeContext(node.children, id, node);
      if (found) return found;
    }
  }
  return null;
}

function findComponentContext(components: any[] | undefined, componentId: string) {
  return (components || []).find((component) => component.id === componentId || component.name === componentId) ?? null;
}

function collectDescendantIds(node: { id: string; children?: any[] }, out = new Set<string>()) {
  out.add(node.id);
  for (const child of node.children || []) collectDescendantIds(child, out);
  return out;
}

function removeNodeFromAst(nodes: any[], id: string): any | null {
  const index = nodes.findIndex((node) => node.id === id);
  if (index >= 0) {
    return nodes.splice(index, 1)[0] ?? null;
  }
  for (const node of nodes) {
    if (node.children) {
      const removed = removeNodeFromAst(node.children, id);
      if (removed) return removed;
    }
  }
  return null;
}

function getNodeFrame(node: ViewerNode) {
  return {
    x: Number(node.x ?? 0),
    y: Number(node.y ?? 0),
    w: Number(node.w ?? 0),
    h: Number(node.h ?? 0),
  };
}

function pointInsideNode(x: number, y: number, node: ViewerNode) {
  const frame = getNodeFrame(node);
  return x >= frame.x && x <= frame.x + frame.w && y >= frame.y && y <= frame.y + frame.h;
}

function getCenter(node: ViewerNode) {
  const frame = getNodeFrame(node);
  return { x: frame.x + frame.w / 2, y: frame.y + frame.h / 2 };
}

function findFlexDropTarget(nodes: ViewerNode[], dragged: ViewerNode, excludedIds: Set<string>): ViewerNode | null {
  const center = getCenter(dragged);
  let best: ViewerNode | null = null;
  let bestArea = Infinity;

  const visit = (list: ViewerNode[]) => {
    for (const node of list) {
      if (excludedIds.has(node.id)) continue;
      if (node.kind === "flex" && pointInsideNode(center.x, center.y, node)) {
        const frame = getNodeFrame(node);
        const area = frame.w * frame.h;
        if (area < bestArea) {
          best = node;
          bestArea = area;
        }
      }
      if (node.children?.length) visit(node.children);
    }
  };

  visit(nodes);
  return best;
}

function isContainerNode(node: ViewerNode) {
  return node.kind === "frame" || node.kind === "group" || node.kind === "rect" || node.kind === "flex" || (node.children?.length ?? 0) > 0;
}

function findContainerDropTarget(nodes: ViewerNode[], dragged: ViewerNode, excludedIds: Set<string>): ViewerNode | null {
  const center = getCenter(dragged);
  let best: ViewerNode | null = null;
  let bestArea = Infinity;

  const visit = (list: ViewerNode[]) => {
    for (const node of list) {
      if (excludedIds.has(node.id)) continue;
      if (isContainerNode(node) && pointInsideNode(center.x, center.y, node)) {
        const frame = getNodeFrame(node);
        const area = frame.w * frame.h;
        if (area < bestArea) {
          best = node;
          bestArea = area;
        }
      }
      if (node.children?.length) visit(node.children);
    }
  };

  visit(nodes);
  return best;
}

function distance(a: number, b: number) {
  return Math.abs(a - b);
}

function inferPlacementRules(node: ViewerNode, siblings: ViewerNode[], parent: ViewerNode | null) {
  const threshold = 24;
  const nodeFrame = getNodeFrame(node);
  const nodeCenter = getCenter(node);

  if (parent) {
    const parentFrame = getNodeFrame(parent);
    const parentCenterX = parentFrame.x + parentFrame.w / 2;
    const parentCenterY = parentFrame.y + parentFrame.h / 2;
    if (Math.abs(nodeCenter.x - parentCenterX) <= threshold && Math.abs(nodeCenter.y - parentCenterY) <= threshold) {
      return { place: [{ type: "centered", ref: parent.id }], clearXY: true };
    }
    if (Math.abs(nodeCenter.x - parentCenterX) <= threshold) {
      return { place: [{ type: "centerX", ref: parent.id }], clearXY: true };
    }
    if (Math.abs(nodeCenter.y - parentCenterY) <= threshold) {
      return { place: [{ type: "centerY", ref: parent.id }], clearXY: true };
    }
  }

  let best: { score: number; place: any[]; clearXY: boolean } | null = null;
  for (const sibling of siblings) {
    if (sibling.id === node.id) continue;
    const s = getNodeFrame(sibling);
    const siblingCenter = getCenter(sibling);

    const verticalGap = Math.round(nodeFrame.y - (s.y + s.h));
    const horizontalCenterDelta = Math.abs(nodeCenter.x - siblingCenter.x);
    const leftDelta = Math.abs(nodeFrame.x - s.x);
    const rightDelta = Math.abs((nodeFrame.x + nodeFrame.w) - (s.x + s.w));
    if (Math.abs(verticalGap) <= threshold) {
      if (horizontalCenterDelta <= threshold) {
        const candidate = { score: Math.abs(verticalGap) + horizontalCenterDelta, place: [{ type: "below", ref: sibling.id, by: Math.max(0, verticalGap) }, { type: "centerX", ref: sibling.id }], clearXY: true };
        if (!best || candidate.score < best.score) best = candidate;
      } else if (leftDelta <= threshold) {
        const candidate = { score: Math.abs(verticalGap) + leftDelta, place: [{ type: "below", ref: sibling.id, by: Math.max(0, verticalGap) }, { type: "alignLeft", ref: sibling.id }], clearXY: true };
        if (!best || candidate.score < best.score) best = candidate;
      } else if (rightDelta <= threshold) {
        const candidate = { score: Math.abs(verticalGap) + rightDelta, place: [{ type: "below", ref: sibling.id, by: Math.max(0, verticalGap) }, { type: "alignRight", ref: sibling.id }], clearXY: true };
        if (!best || candidate.score < best.score) best = candidate;
      }
    }

    const aboveGap = Math.round(s.y - (nodeFrame.y + nodeFrame.h));
    if (Math.abs(aboveGap) <= threshold) {
      if (horizontalCenterDelta <= threshold) {
        const candidate = { score: Math.abs(aboveGap) + horizontalCenterDelta, place: [{ type: "above", ref: sibling.id, by: Math.max(0, aboveGap) }, { type: "centerX", ref: sibling.id }], clearXY: true };
        if (!best || candidate.score < best.score) best = candidate;
      } else if (leftDelta <= threshold) {
        const candidate = { score: Math.abs(aboveGap) + leftDelta, place: [{ type: "above", ref: sibling.id, by: Math.max(0, aboveGap) }, { type: "alignLeft", ref: sibling.id }], clearXY: true };
        if (!best || candidate.score < best.score) best = candidate;
      } else if (rightDelta <= threshold) {
        const candidate = { score: Math.abs(aboveGap) + rightDelta, place: [{ type: "above", ref: sibling.id, by: Math.max(0, aboveGap) }, { type: "alignRight", ref: sibling.id }], clearXY: true };
        if (!best || candidate.score < best.score) best = candidate;
      }
    }

    const horizontalGap = Math.round(nodeFrame.x - (s.x + s.w));
    const verticalCenterDelta = Math.abs(nodeCenter.y - siblingCenter.y);
    const topDelta = Math.abs(nodeFrame.y - s.y);
    const bottomDelta = Math.abs((nodeFrame.y + nodeFrame.h) - (s.y + s.h));
    if (Math.abs(horizontalGap) <= threshold) {
      if (verticalCenterDelta <= threshold) {
        const candidate = { score: Math.abs(horizontalGap) + verticalCenterDelta, place: [{ type: "rightOf", ref: sibling.id, by: Math.max(0, horizontalGap) }, { type: "centerY", ref: sibling.id }], clearXY: true };
        if (!best || candidate.score < best.score) best = candidate;
      } else if (topDelta <= threshold) {
        const candidate = { score: Math.abs(horizontalGap) + topDelta, place: [{ type: "rightOf", ref: sibling.id, by: Math.max(0, horizontalGap) }, { type: "alignTop", ref: sibling.id }], clearXY: true };
        if (!best || candidate.score < best.score) best = candidate;
      } else if (bottomDelta <= threshold) {
        const candidate = { score: Math.abs(horizontalGap) + bottomDelta, place: [{ type: "rightOf", ref: sibling.id, by: Math.max(0, horizontalGap) }, { type: "alignBottom", ref: sibling.id }], clearXY: true };
        if (!best || candidate.score < best.score) best = candidate;
      }
    }

    const leftGap = Math.round(s.x - (nodeFrame.x + nodeFrame.w));
    if (Math.abs(leftGap) <= threshold) {
      if (verticalCenterDelta <= threshold) {
        const candidate = { score: Math.abs(leftGap) + verticalCenterDelta, place: [{ type: "leftOf", ref: sibling.id, by: Math.max(0, leftGap) }, { type: "centerY", ref: sibling.id }], clearXY: true };
        if (!best || candidate.score < best.score) best = candidate;
      } else if (topDelta <= threshold) {
        const candidate = { score: Math.abs(leftGap) + topDelta, place: [{ type: "leftOf", ref: sibling.id, by: Math.max(0, leftGap) }, { type: "alignTop", ref: sibling.id }], clearXY: true };
        if (!best || candidate.score < best.score) best = candidate;
      } else if (bottomDelta <= threshold) {
        const candidate = { score: Math.abs(leftGap) + bottomDelta, place: [{ type: "leftOf", ref: sibling.id, by: Math.max(0, leftGap) }, { type: "alignBottom", ref: sibling.id }], clearXY: true };
        if (!best || candidate.score < best.score) best = candidate;
      }
    }
  }

  return best;
}

function buildInsidePlacement(node: ViewerNode, container: ViewerNode) {
  const n = getNodeFrame(node);
  const c = getNodeFrame(container);
  const top = Math.max(0, Math.round(n.y - c.y));
  const right = Math.max(0, Math.round((c.x + c.w) - (n.x + n.w)));
  const bottom = Math.max(0, Math.round((c.y + c.h) - (n.y + n.h)));
  const left = Math.max(0, Math.round(n.x - c.x));
  return [{ type: "inside", ref: container.id, inset: [top, right, bottom, left] }];
}

function applyDropResolution(doc: any, resolvedView: ViewerDoc, nodeId: string) {
  const astContext = findNodeContext(doc.children, nodeId);
  const viewContext = findNodeContext(resolvedView.children, nodeId);
  if (!astContext || !viewContext) return false;

  const draggedView = viewContext.node;
  const excludedIds = collectDescendantIds(draggedView);
  const targetFlex = findFlexDropTarget(resolvedView.children, draggedView, excludedIds);

  if (targetFlex) {
    const movedAstNode = removeNodeFromAst(doc.children, nodeId);
    const targetAstContext = findNodeContext(doc.children, targetFlex.id);
    if (!movedAstNode || !targetAstContext) return false;
    if (!targetAstContext.node.children) targetAstContext.node.children = [];

    const axis = targetFlex.direction === "row" ? "x" : "y";
    const dragCenter = getCenter(draggedView)[axis];
    const targetChildren = (targetFlex.children || []).filter((child) => !excludedIds.has(child.id));
    const insertIndex = targetChildren.filter((child) => getCenter(child)[axis] < dragCenter).length;

    delete movedAstNode.x;
    delete movedAstNode.y;
    movedAstNode.place = undefined;
    targetAstContext.node.children.splice(insertIndex, 0, movedAstNode);
    return true;
  }

  const targetContainer = findContainerDropTarget(resolvedView.children, draggedView, excludedIds);
  if (targetContainer && targetContainer.id !== (viewContext.parent?.id ?? null)) {
    const movedAstNode = removeNodeFromAst(doc.children, nodeId);
    const targetAstContext = findNodeContext(doc.children, targetContainer.id);
    if (!movedAstNode || !targetAstContext) return false;
    if (!targetAstContext.node.children) targetAstContext.node.children = [];

    movedAstNode.x = Math.round(Number(draggedView.x ?? movedAstNode.x ?? 0));
    movedAstNode.y = Math.round(Number(draggedView.y ?? movedAstNode.y ?? 0));
    movedAstNode.place = buildInsidePlacement(draggedView, targetContainer);
    targetAstContext.node.children.push(movedAstNode);
    return true;
  }

  if (targetContainer && targetContainer.id === (viewContext.parent?.id ?? null) && targetContainer.kind !== "flex") {
    const astNode: any = astContext.node;
    astNode.x = Math.round(Number(draggedView.x ?? astNode.x ?? 0));
    astNode.y = Math.round(Number(draggedView.y ?? astNode.y ?? 0));
    astNode.place = buildInsidePlacement(draggedView, targetContainer);
    return true;
  }

  const inferred = inferPlacementRules(draggedView, viewContext.siblings, viewContext.parent);
  if (inferred) {
    const astNode: any = astContext.node;
    astNode.place = inferred.place;
    if (inferred.clearXY) {
      delete astNode.x;
      delete astNode.y;
    }
    return true;
  }

  if (astContext.parent) {
    const movedAstNode = removeNodeFromAst(doc.children, nodeId);
    if (!movedAstNode) return false;
    movedAstNode.x = Math.round(Number(draggedView.x ?? movedAstNode.x ?? 0));
    movedAstNode.y = Math.round(Number(draggedView.y ?? movedAstNode.y ?? 0));
    movedAstNode.place = undefined;
    doc.children.push(movedAstNode);
    return true;
  }

  const astNode: any = astContext.node;
  astNode.x = Math.round(Number(draggedView.x ?? astNode.x ?? 0));
  astNode.y = Math.round(Number(draggedView.y ?? astNode.y ?? 0));
  astNode.place = undefined;
  return true;
}

export function applyDragToView(view: ViewerDoc, nodeId: string, dx: number, dy: number): ViewerDoc {
  const next: ViewerDoc = JSON.parse(JSON.stringify(view));
  updateViewerNode(next.children, nodeId, dx, dy);
  return next;
}

export function applyDragToSource(src: string, nodeId: string, dx: number, dy: number): string {
  const res = parseWFML(src) as any;
  const doc = res.doc;
  if (!doc?.children) return src;
  if (!updateAstNode(doc.children, nodeId, dx, dy)) return src;
  inferDocumentSemantics(doc);
  return emitWFML(doc);
}

export function resolveDragToSource(src: string, view: ViewerDoc, nodeId: string, dx: number, dy: number): string {
  const res = parseWFML(src) as any;
  const doc = res.doc;
  if (!doc?.children) return src;

  const resolvedView = applyDragToView(view, nodeId, dx, dy);
  if (!applyDropResolution(doc, resolvedView, nodeId)) return src;
  inferDocumentSemantics(doc);
  return emitWFML(doc);
}

export function insertRootNodeIntoSource(src: string, node: any): string {
  const res = parseWFML(src) as any;
  const doc = res.doc;
  if (!doc) return src;
  if (!doc.children) doc.children = [];
  doc.children.push(node);
  inferDocumentSemantics(doc);
  return emitWFML(doc);
}

export function updateNodePropertyInSource(src: string, nodeId: string, propertyPath: string, value: any): string {
  const res = parseWFML(src) as any;
  const doc = res.doc;
  if (!doc?.children) return src;

  const updateNode = (nodes: any[]): boolean => {
    for (const node of nodes) {
      if (node.id === nodeId) {
        setDeepValue(node, propertyPath, value);
        return true;
      }
      if (node.children && updateNode(node.children)) return true;
    }
    return false;
  };

  if (!updateNode(doc.children)) return src;
  inferDocumentSemantics(doc);
  return emitWFML(doc);
}

export function deleteNodeFromSource(src: string, nodeId: string): string {
  const res = parseWFML(src) as any;
  const doc = res.doc;
  if (!doc?.children) return src;

  const removeNode = (nodes: any[]): boolean => {
    const index = nodes.findIndex((node) => node.id === nodeId);
    if (index >= 0) {
      nodes.splice(index, 1);
      return true;
    }
    for (const node of nodes) {
      if (node.children && removeNode(node.children)) return true;
    }
    return false;
  };

  if (!removeNode(doc.children)) return src;
  inferDocumentSemantics(doc);
  return emitWFML(doc);
}

export function duplicateNodeInSource(src: string, nodeId: string): { src: string; duplicatedId: string | null } {
  const res = parseWFML(src) as any;
  const doc = res.doc;
  if (!doc?.children) return { src, duplicatedId: null };

  const used = collectIds(doc.children);
  let duplicatedId: string | null = null;

  const duplicateNode = (nodes: any[]): boolean => {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.id === nodeId) {
        const copy = cloneNode(node);
        rekeySubtree(copy, used);
        duplicatedId = copy.id;
        nodes.splice(i + 1, 0, copy);
        return true;
      }
      if (node.children && duplicateNode(node.children)) return true;
    }
    return false;
  };

  if (!duplicateNode(doc.children)) return { src, duplicatedId: null };
  inferDocumentSemantics(doc);
  return { src: emitWFML(doc), duplicatedId };
}

export function copyNodeFromSource(src: string, nodeId: string): any | null {
  const res = parseWFML(src) as any;
  const doc = res.doc;
  if (!doc?.children) return null;

  const findNode = (nodes: any[]): any | null => {
    for (const node of nodes) {
      if (node.id === nodeId) return cloneNode(node);
      if (node.children) {
        const child = findNode(node.children);
        if (child) return child;
      }
    }
    return null;
  };

  return findNode(doc.children);
}

export function pasteNodeIntoSource(src: string, node: any): { src: string; pastedId: string | null } {
  const res = parseWFML(src) as any;
  const doc = res.doc;
  if (!doc) return { src, pastedId: null };
  if (!doc.children) doc.children = [];

  const used = collectIds(doc.children);
  const copy = cloneNode(node);
  rekeySubtree(copy, used);
  doc.children.push(copy);
  inferDocumentSemantics(doc);
  return { src: emitWFML(doc), pastedId: copy.id || null };
}

export function updateInstanceOverrideInSource(src: string, instanceId: string, propName: string, value: any): string {
  const res = parseWFML(src) as any;
  const doc = res.doc;
  if (!doc?.children) return src;

  const updateNode = (nodes: any[]): boolean => {
    for (const node of nodes) {
      if (node.id === instanceId && node.kind === "instance") {
        node.overrides = node.overrides || {};
        node.overrides[propName] = value;
        return true;
      }
      if (node.children && updateNode(node.children)) return true;
    }
    return false;
  };

  if (!updateNode(doc.children)) return src;
  inferDocumentSemantics(doc);
  return emitWFML(doc);
}

export function updateComponentNodePropertyInSource(src: string, componentId: string, nodeId: string, propertyPath: string, value: any): string {
  const res = parseWFML(src) as any;
  const doc = res.doc;
  const component = findComponentContext(doc?.components, componentId);
  if (!component?.nodes) return src;

  const updateNode = (nodes: any[]): boolean => {
    for (const node of nodes) {
      if (node.id === nodeId) {
        setDeepValue(node, propertyPath, value);
        return true;
      }
      if (node.children && updateNode(node.children)) return true;
    }
    return false;
  };

  if (!updateNode(component.nodes)) return src;
  inferDocumentSemantics(doc);
  return emitWFML(doc);
}

export function deleteComponentNodeFromSource(src: string, componentId: string, nodeId: string): string {
  const res = parseWFML(src) as any;
  const doc = res.doc;
  const component = findComponentContext(doc?.components, componentId);
  if (!component?.nodes) return src;
  if (!removeNodeFromAst(component.nodes, nodeId)) return src;
  inferDocumentSemantics(doc);
  return emitWFML(doc);
}

export function moveComponentNodeInSource(src: string, componentId: string, nodeId: string, dx: number, dy: number): string {
  const res = parseWFML(src) as any;
  const doc = res.doc;
  const component = findComponentContext(doc?.components, componentId);
  if (!component?.nodes) return src;
  if (!updateAstNode(component.nodes, nodeId, dx, dy)) return src;
  inferDocumentSemantics(doc);
  return emitWFML(doc);
}

export function bindComponentNodeFieldToPropInSource(
  src: string,
  componentId: string,
  nodeId: string,
  fieldPath: string,
  propName: string,
  propType: "string" | "number" | "boolean" | "color" | "image",
): string {
  const res = parseWFML(src) as any;
  const doc = res.doc;
  const component = findComponentContext(doc?.components, componentId);
  if (!component?.nodes) return src;

  const findNode = (nodes: any[]): any | null => {
    for (const node of nodes) {
      if (node.id === nodeId) return node;
      if (node.children) {
        const child = findNode(node.children);
        if (child) return child;
      }
    }
    return null;
  };

  const getDeepValue = (obj: any, path: string) => path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
  const node = findNode(component.nodes);
  if (!node) return src;

  const defaultValue = getDeepValue(node, fieldPath);
  component.props = component.props || {};
  component.props[propName] = {
    ...(component.props[propName] || {}),
    type: propType,
    default: defaultValue,
    label: component.props[propName]?.label || propName,
    bindings: [{ nodeId, field: fieldPath }],
  };
  setDeepValue(node, fieldPath, `$props.${propName}`);

  inferDocumentSemantics(doc);
  return emitWFML(doc);
}

export function insertNodeIntoComponentInSource(src: string, componentId: string, node: any): string {
  const res = parseWFML(src) as any;
  const doc = res.doc;
  const component = findComponentContext(doc?.components, componentId);
  if (!component) return src;
  component.nodes = component.nodes || [];
  component.nodes.push(node);
  inferDocumentSemantics(doc);
  return emitWFML(doc);
}

export function createComponentFromNodeInSource(src: string, nodeId: string, componentName: string, semanticRole?: string): { src: string; instanceId: string | null } {
  const res = parseWFML(src) as any;
  const doc = res.doc;
  if (!doc?.children) return { src, instanceId: null };

  const removed = removeNodeFromAst(doc.children, nodeId);
  if (!removed) return { src, instanceId: null };

  const originX = Math.round(Number(removed.x ?? 0));
  const originY = Math.round(Number(removed.y ?? 0));
  shiftAstSubtree(removed, -originX, -originY);

  doc.components = doc.components || [];
  const componentId = uniquifyId(slug(componentName || removed.id || "component"), collectComponentIds(doc.components));
  const component: any = {
    id: componentId,
    name: componentName,
    nodes: [removed],
  };
  if (semanticRole) component.semantic = { role: semanticRole, inferred: false };
  doc.components.push(component);

  const usedNodeIds = collectIds(doc.children);
  const instanceId = uniquifyId(slug(componentName || removed.id || "instance"), usedNodeIds);
  doc.children.push({
    kind: "instance",
    id: instanceId,
    of: componentName,
    x: originX,
    y: originY,
  });

  inferDocumentSemantics(doc);
  return { src: emitWFML(doc), instanceId };
}
