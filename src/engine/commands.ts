import { emitWFML, parseWFML } from "../parser/wfml-grammar-parser-emitter";
import { inferDocumentSemantics } from "./inference";
import type { ViewerDoc, ViewerNode } from "./scene";

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
