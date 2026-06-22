// src/components/WFMLReactViewerInline.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";

import { applyDragToView, bindComponentNodeFieldToPropInSource, copyNodeFromSource, createComponentFromNodeInSource, deleteComponentNodeFromSource, deleteComponentNodesFromSource, deleteNodeFromSource, deleteNodesFromSource, duplicateNodeInSource, insertNodeIntoComponentInSource, insertRootNodeIntoSource, moveComponentNodeInSource, moveComponentNodesInSource, moveNodesInSource, pasteNodeIntoSource, resolveDragToSource, updateComponentNodePropertiesInSource, updateComponentNodePropertyInSource, updateInstanceOverrideInSource, updateNodePropertiesInSource, updateNodePropertyInSource } from "../engine/commands";
import { createDefaultCamera, fitCameraToBounds, panCamera, scrollCamera, zoomCameraAtPoint, type Camera } from "../engine/camera";
import { layoutDoc } from "../engine/layout";
import { createNodeFromRegistry, createNodeRegistry, getToolDefinitions, type NodePropertyDefinition } from "../engine/registry";
import { findNodeById, getSceneBounds, mapDoc, type ViewerDoc, type ViewerNode } from "../engine/scene";
import { parseWFML } from "../parser/wfml-grammar-parser-emitter";
import { primitiveNodeDefinitions } from "../core-library/primitives";
import { CanvasShell } from "../studio/components/CanvasShell";
import { NodeWrapper } from "../studio/components/NodeWrapper";
import { Toolbar } from "../studio/components/Toolbar";
import { useDocumentHistory } from "../studio/hooks/useDocumentHistory";
import { CodeEditorPanel } from "../studio/panels/CodeEditorPanel";
import { PropertyInspectorPanel } from "../studio/panels/PropertyInspectorPanel";

const STORAGE_KEY = "llm2wireframe.wfml";
const CAMERA_STORAGE_KEY = "llm2wireframe.camera";

export default function WFMLReactViewerInline({
  initialText,
  height = "100vh",
}: { initialText?: string; height?: number | string }) {
  type EditorMode = { type: "document" } | { type: "component"; componentId: string };
  type DraftShape = { kind: string; id: string; startX: number; startY: number; currentX: number; currentY: number; points?: [number, number][] };
  type EditingText = { nodeId: string; value: string };
  type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
  type ResizeState = { nodeId: string; handle: ResizeHandle; startPointer: { x: number; y: number }; origin: { x: number; y: number; w: number; h: number }; originalPoints?: [number, number][]; clearBindings?: boolean };
  type LinearHandle = "start" | "end";
  type LinearEditState = { nodeId: string; handle: LinearHandle; origin: { x: number; y: number; w: number; h: number }; points: [number, number][] };
  type SelectionBox = { startX: number; startY: number; currentX: number; currentY: number; additive: boolean };
  type RotationState = { nodeId: string; startAngle: number; center: { x: number; y: number }; originalRotation: number };
  type LassoState = { points: [number, number][] };

  const SAMPLE = initialText ?? `meta:
  version: 0.1
  author: you

frame iPhone13:
  w: 390
  h: 844
  style:
    fill: #F5F6FA

  flex container:
    direction: column
    gap: 24
    padding: 32
    align: center
    w: fill
    h: hug
    place: centered in #iPhone13

    image logo:
      src: https://dummyimage.com/64x64/2b59ff/ffffff.png&text=U
      w: 64
      h: 64

    text title:
      text: "Welcome back"
      style:
        text:
          size: 24
          weight: 700

    flex form:
      direction: column
      gap: 16
      w: fill
      h: hug

      rect email:
        w: fill
        h: 44
        style:
          fill: #ffffff
          stroke: #999
          corner: 10
          
      rect password:
        w: fill
        h: 44
        style:
          fill: #ffffff
          stroke: #999
          corner: 10

      rect loginbtn:
        w: fill
        h: 44
        style:
          fill: #2B59FF
          corner: 10
        
        text logintext:
          text: "Sign in"
          style:
            text:
              size: 16
              weight: 600
          place: centered in #loginbtn
`;

  const { src, setDocument, replaceDocument, undo, redo, canUndo, canRedo } = useDocumentHistory(SAMPLE);
  const [parseErrors, setParseErrors] = useState<any[]>([]);
  const parsed = useMemo(() => parseWFML(src), [src]);
  const [view, setView] = useState<ViewerDoc | null>(null);
  const parsedDoc = (parsed as any).doc;
  
  // Interactive state
  const [showCode, setShowCode] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>({ type: "document" });
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingSelectionId, setPendingSelectionId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [resizePreview, setResizePreview] = useState<{ nodeId: string; x: number; y: number; w: number; h: number; points?: [number, number][] } | null>(null);
  const [linearEditState, setLinearEditState] = useState<LinearEditState | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [draftShape, setDraftShape] = useState<DraftShape | null>(null);
  const [editingText, setEditingText] = useState<EditingText | null>(null);
  const [rotationState, setRotationState] = useState<RotationState | null>(null);
  const [lassoState, setLassoState] = useState<LassoState | null>(null);

  // Camera State
  const [camera, setCamera] = useState<Camera>(createDefaultCamera());
  const [isPanning, setIsPanning] = useState(false);
  const clipboardRef = useRef<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const registry = useMemo(() => createNodeRegistry(primitiveNodeDefinitions), []);
  const toolbarTools = useMemo(() => getToolDefinitions(registry), [registry]);
  const activeComponent = useMemo(() => {
    if (editorMode.type !== "component") return null;
    return parsedDoc?.components?.find((component: any) => component.id === editorMode.componentId) ?? null;
  }, [editorMode, parsedDoc]);
  const selectedNode = useMemo(() => (view ? findNodeById(view.children, selectedId) : null), [view, selectedId]);
  const selectedDefinition = useMemo(() => (selectedNode && !selectedNode.isInstanceRoot ? registry.get(selectedNode.kind) : undefined), [registry, selectedNode]);
  const hasParseErrors = parseErrors.length > 0;

  const nodeRefs = useRef<Record<string, SVGGElement | null>>({});
  const dragStartPos = useRef({ x: 0, y: 0 });
  const currentDelta = useRef({ x: 0, y: 0 });

  const zoomPercent = Math.round(camera.z * 100);
  const dragDrawToolKinds = new Set(["frame", "rect", "flex", "ellipse", "diamond", "sticky", "image", "line", "arrow", "freehand"]);

  const getCanvasWorldPoint = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - camera.x) / camera.z,
      y: (e.clientY - rect.top - camera.y) / camera.z,
    };
  };

  const normalizeDraftBounds = (shape: DraftShape) => {
    const left = Math.min(shape.startX, shape.currentX);
    const top = Math.min(shape.startY, shape.currentY);
    const width = Math.max(8, Math.abs(shape.currentX - shape.startX));
    const height = Math.max(8, Math.abs(shape.currentY - shape.startY));
    return { x: Math.round(left), y: Math.round(top), w: Math.round(width), h: Math.round(height) };
  };

  const normalizeDraftLinear = (shape: DraftShape) => {
    const minX = Math.min(shape.startX, shape.currentX);
    const minY = Math.min(shape.startY, shape.currentY);
    const endX = shape.currentX;
    const endY = shape.currentY;
    return {
      x: Math.round(minX),
      y: Math.round(minY),
      w: Math.max(1, Math.round(Math.abs(shape.currentX - shape.startX))),
      h: Math.max(1, Math.round(Math.abs(shape.currentY - shape.startY))),
      points: [
        [Math.round(shape.startX - minX), Math.round(shape.startY - minY)],
        [Math.round(endX - minX), Math.round(endY - minY)],
      ],
    };
  };

  const normalizeFreehandDraft = (shape: DraftShape) => {
    const rawPoints = shape.points?.length ? shape.points : [[shape.startX, shape.startY], [shape.currentX, shape.currentY]];
    const xs = rawPoints.map((point) => point[0]);
    const ys = rawPoints.map((point) => point[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return {
      x: Math.round(minX),
      y: Math.round(minY),
      w: Math.max(1, Math.round(maxX - minX)),
      h: Math.max(1, Math.round(maxY - minY)),
      points: rawPoints.map((point) => [Math.round(point[0] - minX), Math.round(point[1] - minY)] as [number, number]),
    };
  };

  const supportsInlineText = (kind: string) => kind === "rect" || kind === "ellipse" || kind === "diamond" || kind === "text" || kind === "sticky";

  const isResizableNode = (node: ViewerNode | null) => Boolean(node && !node.isInstanceRoot);

  const isLinearNode = (node: ViewerNode | null) => node?.kind === "line" || node?.kind === "arrow";

  const scalePointsToFrame = (points: [number, number][] | undefined, origin: { w: number; h: number }, next: { w: number; h: number }) => {
    if (!points?.length) return undefined;
    const scaleX = origin.w === 0 ? 1 : next.w / origin.w;
    const scaleY = origin.h === 0 ? 1 : next.h / origin.h;
    return points.map(([px, py]) => [Math.round(px * scaleX), Math.round(py * scaleY)] as [number, number]);
  };

  const computeResizeFrame = (origin: { x: number; y: number; w: number; h: number }, handle: ResizeHandle, dx: number, dy: number) => {
    let nextX = origin.x;
    let nextY = origin.y;
    let nextW = origin.w;
    let nextH = origin.h;
    if (handle.includes("e")) nextW = origin.w + dx;
    if (handle.includes("s")) nextH = origin.h + dy;
    if (handle.includes("w")) {
      nextX = origin.x + dx;
      nextW = origin.w - dx;
    }
    if (handle.includes("n")) {
      nextY = origin.y + dy;
      nextH = origin.h - dy;
    }
    if (nextW < 8) {
      if (handle.includes("w")) nextX -= 8 - nextW;
      nextW = 8;
    }
    if (nextH < 8) {
      if (handle.includes("n")) nextY -= 8 - nextH;
      nextH = 8;
    }
    return { x: Math.round(nextX), y: Math.round(nextY), w: Math.round(nextW), h: Math.round(nextH) };
  };

  const getAnchorPointForNode = (node: ViewerNode, anchor?: string) => {
    const x = Number(node.x ?? 0);
    const y = Number(node.y ?? 0);
    const w = Number(node.w ?? 0);
    const h = Number(node.h ?? 0);
    switch (anchor) {
      case "top": return [x + w / 2, y] as [number, number];
      case "bottom": return [x + w / 2, y + h] as [number, number];
      case "left": return [x, y + h / 2] as [number, number];
      case "right": return [x + w, y + h / 2] as [number, number];
      default: return [x + w / 2, y + h / 2] as [number, number];
    }
  };

  const getRenderedLinearPoints = (node: ViewerNode, x: number, y: number, w: number, h: number) => {
    const basePoints = Array.isArray((node as any).points) && (node as any).points.length >= 2
      ? ((node as any).points as [number, number][]).map((point) => [x + Number(point[0] ?? 0), y + Number(point[1] ?? 0)] as [number, number])
      : [[x, y], [x + w, y + h]];
    const points = basePoints.map((point) => [...point] as [number, number]);
    const from = (node as any).from;
    const to = (node as any).to;
    if (from?.ref && view) {
      const fromNode = findNodeById(view.children, from.ref);
      if (fromNode) points[0] = getAnchorPointForNode(fromNode, from.anchor);
    }
    if (to?.ref && view) {
      const toNode = findNodeById(view.children, to.ref);
      if (toNode) points[points.length - 1] = getAnchorPointForNode(toNode, to.anchor);
    }
    return points;
  };

  const worldPointsToFrame = (points: [number, number][]) => {
    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return {
      x: Math.round(minX),
      y: Math.round(minY),
      w: Math.max(1, Math.round(maxX - minX)),
      h: Math.max(1, Math.round(maxY - minY)),
      points: points.map((point) => [Math.round(point[0] - minX), Math.round(point[1] - minY)] as [number, number]),
    };
  };

  const collectSelectableNodeIds = (nodes: ViewerNode[]): string[] => {
    const ids: string[] = [];
    const visit = (list: ViewerNode[]) => {
      for (const node of list) {
        if (!node.isInstanceRoot) ids.push(node.id);
        if (node.children?.length) visit(node.children);
      }
    };
    visit(nodes);
    return ids;
  };

  const getSelectionBoxBounds = (box: SelectionBox) => ({
    x: Math.min(box.startX, box.currentX),
    y: Math.min(box.startY, box.currentY),
    w: Math.abs(box.currentX - box.startX),
    h: Math.abs(box.currentY - box.startY),
  });

  const isPointInPolygon = (point: [number, number], polygon: [number, number][]) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      const intersect = ((yi > point[1]) !== (yj > point[1]) &&
        point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const getNodesInLasso = (points: [number, number][]) => {
    if (!view) return [] as string[];
    const ids: string[] = [];
    const visit = (nodes: ViewerNode[]) => {
      for (const node of nodes) {
        if (node.isInstanceRoot) continue;
        const cx = Number(node.x ?? 0) + Number(node.w ?? 0) / 2;
        const cy = Number(node.y ?? 0) + Number(node.h ?? 0) / 2;
        if (isPointInPolygon([cx, cy], points)) ids.push(node.id);
        if (node.children?.length) visit(node.children);
      }
    };
    visit(view.children);
    return ids;
  };

  const hitTestNodeAtWorldPoint = (worldX: number, worldY: number): ViewerNode | null => {
    if (!view) return null;
    let result: ViewerNode | null = null;
    const visit = (nodes: ViewerNode[]) => {
      for (const node of nodes) {
        if (node.isInstanceRoot) continue;
        const x = Number(node.x ?? 0);
        const y = Number(node.y ?? 0);
        const w = Number(node.w ?? 0);
        const h = Number(node.h ?? 0);
        if (worldX >= x && worldX <= x + w && worldY >= y && worldY <= y + h) {
          result = node;
        }
        if (node.children?.length) visit(node.children);
      }
    };
    visit(view.children);
    return result;
  };

  const getNodesInSelectionBox = (box: SelectionBox) => {
    if (!view) return [] as string[];
    const bounds = getSelectionBoxBounds(box);
    const ids: string[] = [];
    const visit = (nodes: ViewerNode[]) => {
      for (const node of nodes) {
        if (node.isInstanceRoot) continue;
        const x = Number(node.x ?? 0);
        const y = Number(node.y ?? 0);
        const w = Number(node.w ?? 0);
        const h = Number(node.h ?? 0);
        const intersects = x <= bounds.x + bounds.w && x + w >= bounds.x && y <= bounds.y + bounds.h && y + h >= bounds.y;
        if (intersects) ids.push(node.id);
        if (node.children?.length) visit(node.children);
      }
    };
    visit(view.children);
    return ids;
  };

  const findArrowBinding = (worldX: number, worldY: number, excludedNodeId?: string) => {
    if (!view) return null;
    let best: ViewerNode | null = null;
    let bestArea = Infinity;
    const visit = (nodes: ViewerNode[]) => {
      for (const node of nodes) {
        if (node.id === excludedNodeId) continue;
        if (["line", "arrow", "freehand", "text"].includes(node.kind)) continue;
        const x = Number(node.x ?? 0);
        const y = Number(node.y ?? 0);
        const w = Number(node.w ?? 0);
        const h = Number(node.h ?? 0);
        if (worldX >= x && worldX <= x + w && worldY >= y && worldY <= y + h) {
          const area = w * h;
          if (area < bestArea) {
            best = node;
            bestArea = area;
          }
        }
        if (node.children?.length) visit(node.children);
      }
    };
    visit(view.children);
    if (!best) return null;
    const x = Number(best.x ?? 0);
    const y = Number(best.y ?? 0);
    const w = Number(best.w ?? 0);
    const h = Number(best.h ?? 0);
    const distances = [
      { anchor: "left", value: Math.abs(worldX - x) },
      { anchor: "right", value: Math.abs(worldX - (x + w)) },
      { anchor: "top", value: Math.abs(worldY - y) },
      { anchor: "bottom", value: Math.abs(worldY - (y + h)) },
    ].sort((a, b) => a.value - b.value);
    return { ref: best.id, anchor: distances[0]?.anchor as "left" | "right" | "top" | "bottom" };
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!initialText) {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) replaceDocument(stored);
    }
    const storedCamera = window.localStorage.getItem(CAMERA_STORAGE_KEY);
    if (storedCamera) {
      try {
        setCamera(JSON.parse(storedCamera));
      } catch {}
    }
  }, [initialText, replaceDocument]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, src);
  }, [src]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CAMERA_STORAGE_KEY, JSON.stringify(camera));
  }, [camera]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTextInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isTextInput) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }
      if (((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") || ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "z")) {
        event.preventDefault();
        redo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "e") {
        event.preventDefault();
        setShowCode((open) => !open);
        return;
      }
      if (selectedIds.length && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        if (hasParseErrors || !view) return;
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const dx = event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0;
        const dy = event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0;
        setDocument((prev) => editorMode.type === "component"
          ? (selectedIds.length === 1 ? moveComponentNodeInSource(prev, editorMode.componentId, selectedIds[0], dx, dy) : moveComponentNodesInSource(prev, editorMode.componentId, selectedIds, dx, dy))
          : (selectedIds.length === 1 ? resolveDragToSource(prev, view, selectedIds[0], dx, dy) : moveNodesInSource(prev, selectedIds, dx, dy)));
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setEditingText(null);
        setSelectedId(null);
        setDraggingId(null);
        setResizeState(null);
        setResizePreview(null);
        setLinearEditState(null);
        setDraftShape(null);
        setActiveTool(null);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c" && selectedId && selectedIds.length === 1) {
        if (hasParseErrors) return;
        event.preventDefault();
        clipboardRef.current = copyNodeFromSource(src, selectedId);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v" && clipboardRef.current) {
        if (hasParseErrors) return;
        event.preventDefault();
        setDocument((prev) => {
          const result = pasteNodeIntoSource(prev, clipboardRef.current);
          if (result.pastedId) queueSelection(result.pastedId);
          return result.src;
        });
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d" && selectedId && selectedIds.length === 1) {
        if (hasParseErrors) return;
        event.preventDefault();
        setDocument((prev) => {
          const result = duplicateNodeInSource(prev, selectedId);
          if (result.duplicatedId) queueSelection(result.duplicatedId);
          return result.src;
        });
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        if (hasParseErrors) return;
        event.preventDefault();
        setDocument((prev) => editorMode.type === "component"
          ? (selectedIds.length === 1 ? deleteComponentNodeFromSource(prev, editorMode.componentId, selectedId) : deleteComponentNodesFromSource(prev, editorMode.componentId, selectedIds))
          : (selectedIds.length === 1 ? deleteNodeFromSource(prev, selectedId) : deleteNodesFromSource(prev, selectedIds)));
        clearSelection();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editorMode, hasParseErrors, redo, selectedId, selectedIds, setDocument, src, undo, view]);

  useEffect(() => {
    const { doc, errors } = parsed as any;
    setParseErrors(errors || []);
    if (!doc) { setView(null); return; }
    if (editorMode.type === "component") {
      const component = doc.components?.find((entry: any) => entry.id === editorMode.componentId);
      if (!component) {
        setEditorMode({ type: "document" });
        setView(layoutDoc(mapDoc(doc)));
        return;
      }
      setView(layoutDoc(mapDoc({ ...doc, children: component.nodes || [] })));
      return;
    }
    setView(layoutDoc(mapDoc(doc)));
  }, [editorMode, parsed]);

  useEffect(() => {
    if (pendingSelectionId && selectedNode?.id === pendingSelectionId) {
      setPendingSelectionId(null);
      return;
    }
    if (selectedId && !selectedNode) {
      if (pendingSelectionId === selectedId) return;
      setSelectedId(null);
      setDraggingId(null);
      setResizeState(null);
      setResizePreview(null);
      setLinearEditState(null);
      setEditingText((current) => current && current.nodeId === selectedId ? null : current);
    }
  }, [pendingSelectionId, selectedId, selectedNode]);

  useEffect(() => {
    if (!view) return;
    const nextIds = selectedIds.filter((id) => Boolean(findNodeById(view.children, id)));
    if (nextIds.length !== selectedIds.length) {
      setMultiSelection(nextIds, nextIds.includes(selectedId || "") ? selectedId : nextIds[nextIds.length - 1] ?? null);
    }
  }, [selectedId, selectedIds, view]);

  const commitInlineTextEdit = (nextValue?: string) => {
    if (!editingText || hasParseErrors) return;
    const value = nextValue ?? editingText.value;
    const property: NodePropertyDefinition = { key: "text", label: "Text", type: "text" };
    setDocument((prev) => editorMode.type === "component"
      ? updateComponentNodePropertyInSource(prev, editorMode.componentId, editingText.nodeId, property.key, value)
      : updateNodePropertyInSource(prev, editingText.nodeId, property.key, value));
    setEditingText(null);
  };

  const queueSelection = (nodeId: string | null) => {
    setSelectedId(nodeId);
    setPendingSelectionId(nodeId);
    setSelectedIds(nodeId ? [nodeId] : []);
  };

  const setMultiSelection = (nodeIds: string[], primaryId?: string | null) => {
    const uniqueIds = Array.from(new Set(nodeIds));
    const nextPrimary = primaryId && uniqueIds.includes(primaryId) ? primaryId : uniqueIds[uniqueIds.length - 1] ?? null;
    setSelectedIds(uniqueIds);
    setSelectedId(nextPrimary);
    setPendingSelectionId(nextPrimary);
  };

  const toggleSelection = (nodeId: string) => {
    setSelectedIds((current) => {
      const exists = current.includes(nodeId);
      const next = exists ? current.filter((id) => id !== nodeId) : [...current, nodeId];
      const nextPrimary = exists ? (selectedId === nodeId ? next[next.length - 1] ?? null : selectedId) : nodeId;
      setSelectedId(nextPrimary);
      setPendingSelectionId(nextPrimary);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedId(null);
    setPendingSelectionId(null);
    setSelectedIds([]);
  };

  const rebuild = () => {
    const { doc, errors } = parseWFML(src) as any;
    setParseErrors(errors || []);
    if (!doc) return;
    setView(layoutDoc(mapDoc(doc)));
  };

  const fitViewToScene = () => {
    if (!view || typeof window === "undefined") return;
    const bounds = getSceneBounds(view.children);
    if (!bounds) {
      setCamera(createDefaultCamera());
      return;
    }
    setCamera(fitCameraToBounds(bounds, window.innerWidth, window.innerHeight));
  };

  const zoomBy = (factor: number) => {
    if (typeof window === "undefined") return;
    setCamera((c) => zoomCameraAtPoint(c, window.innerWidth / 2, window.innerHeight / 2, factor));
  };

  const handleDownloadWFML = () => {
    if (typeof window === "undefined") return;
    const blob = new Blob([src], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wireframe.wfml";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImportWFML = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    clearSelection();
    setDraggingId(null);
    clipboardRef.current = null;
    setCamera(createDefaultCamera());
    setDocument(text);
    event.target.value = "";
  };

  const focusSelectedNode = () => {
    if (!selectedNode || typeof window === "undefined") return;
    const x = Number(selectedNode.x ?? 0);
    const y = Number(selectedNode.y ?? 0);
    const w = Math.max(1, Number(selectedNode.w ?? 1));
    const h = Math.max(1, Number(selectedNode.h ?? 1));
    setCamera(fitCameraToBounds({ minX: x, minY: y, width: w, height: h }, window.innerWidth, window.innerHeight, 120));
  };

  const handlePointerDownCanvas = (e: React.PointerEvent<HTMLDivElement>) => {
    if (resizeState || linearEditState) return;
    if (e.button === 1 || e.altKey || e.shiftKey) { // Middle click or Alt/Shift pan
      setIsPanning(true);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // Hand tool: start panning on pointer down
    if (activeTool === "hand") {
      setIsPanning(true);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // Lasso tool: start capturing path
    if (activeTool === "lasso") {
      const world = getCanvasWorldPoint(e);
      setLassoState({ points: [[world.x, world.y]] });
      clearSelection();
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (activeTool && dragDrawToolKinds.has(activeTool)) {
      const world = getCanvasWorldPoint(e);
      const id = `${activeTool}-${Math.floor(Math.random() * 10000)}`;
      setDraftShape({ kind: activeTool, id, startX: world.x, startY: world.y, currentX: world.x, currentY: world.y, points: activeTool === "freehand" ? [[world.x, world.y]] : undefined });
      clearSelection();
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (activeTool) {
      if (hasParseErrors) return;
      const world = getCanvasWorldPoint(e);
      try {
        const id = `${activeTool}-${Math.floor(Math.random() * 10000)}`;
        const newNode = createNodeFromRegistry(registry, activeTool, id, Math.round(world.x), Math.round(world.y));
        setDocument((prev) => editorMode.type === "component"
          ? insertNodeIntoComponentInSource(prev, editorMode.componentId, newNode)
          : insertRootNodeIntoSource(prev, newNode));
        queueSelection(id);
        if (activeTool === "text" || activeTool === "sticky") {
          setEditingText({ nodeId: id, value: String((newNode as any).text ?? "") });
        }
        setActiveTool(null);
      } catch (error) {
        console.error("Failed to insert node", error);
      }
      return;
    }

    const world = getCanvasWorldPoint(e);
    setSelectionBox({ startX: world.x, startY: world.y, currentX: world.x, currentY: world.y, additive: e.shiftKey || e.metaKey || e.ctrlKey });
    if (!(e.shiftKey || e.metaKey || e.ctrlKey)) clearSelection();
  };

  const handlePointerMoveCanvas = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning) {
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      setCamera((c) => panCamera(c, dx, dy));
      return;
    }

    if (draftShape) {
      const world = getCanvasWorldPoint(e);
      setDraftShape((current) => {
        if (!current) return current;
        if (current.kind === "freehand") {
          const points = current.points || [];
          const last = points[points.length - 1];
          if (!last || Math.abs(last[0] - world.x) >= 2 || Math.abs(last[1] - world.y) >= 2) {
            return { ...current, currentX: world.x, currentY: world.y, points: [...points, [world.x, world.y]] };
          }
        }
        return { ...current, currentX: world.x, currentY: world.y };
      });
      return;
    }

    if (selectionBox) {
      const world = getCanvasWorldPoint(e);
      setSelectionBox((current) => current ? { ...current, currentX: world.x, currentY: world.y } : current);
      return;
    }

    if (resizeState) {
      const dx = (e.clientX - resizeState.startPointer.x) / camera.z;
      const dy = (e.clientY - resizeState.startPointer.y) / camera.z;
      const frame = computeResizeFrame(resizeState.origin, resizeState.handle, dx, dy);
      setResizePreview({
        nodeId: resizeState.nodeId,
        ...frame,
        points: scalePointsToFrame(resizeState.originalPoints, resizeState.origin, frame),
      });
      return;
    }

    if (linearEditState) {
      const world = getCanvasWorldPoint(e);
      const nextPoints = linearEditState.points.map((point) => [...point] as [number, number]);
      if (linearEditState.handle === "start") nextPoints[0] = [world.x, world.y];
      else nextPoints[nextPoints.length - 1] = [world.x, world.y];
      const frame = worldPointsToFrame(nextPoints);
      setResizePreview({ nodeId: linearEditState.nodeId, ...frame });
      return;
    }

    // Lasso: add points to path
    if (lassoState) {
      const world = getCanvasWorldPoint(e);
      const last = lassoState.points[lassoState.points.length - 1];
      if (!last || Math.abs(last[0] - world.x) >= 2 || Math.abs(last[1] - world.y) >= 2) {
        setLassoState({ points: [...lassoState.points, [world.x, world.y]] });
      }
      return;
    }

    // Eraser: delete nodes under cursor only while actively dragging (left button pressed)
    if (activeTool === "eraser" && e.buttons === 1) {
      const world = getCanvasWorldPoint(e);
      const hitNode = hitTestNodeAtWorldPoint(world.x, world.y);
      if (hitNode) {
        setDocument((prev) => editorMode.type === "component"
          ? deleteComponentNodeFromSource(prev, editorMode.componentId, hitNode.id)
          : deleteNodeFromSource(prev, hitNode.id));
      }
      return;
    }

    // Rotation: preview rotation via transform
    if (rotationState) {
      const world = getCanvasWorldPoint(e);
      const dx = world.x - rotationState.center.x;
      const dy = world.y - rotationState.center.y;
      const currentAngle = Math.atan2(dy, dx);
      const deltaDeg = (currentAngle - rotationState.startAngle) * (180 / Math.PI);
      const nextRotation = rotationState.originalRotation + deltaDeg;
      const el = nodeRefs.current[rotationState.nodeId];
      if (el) {
        const cx = rotationState.center.x;
        const cy = rotationState.center.y;
        el.setAttribute("transform", `rotate(${nextRotation}, ${cx}, ${cy})`);
      }
      return;
    }

    if (!draggingId) return;
    const dx = (e.clientX - dragStartPos.current.x) / camera.z;
    const dy = (e.clientY - dragStartPos.current.y) / camera.z;
    currentDelta.current = { x: dx, y: dy };

    const idsToMove = selectedIds.length > 1 && selectedIds.includes(draggingId) ? selectedIds : [draggingId];
    for (const id of idsToMove) {
      const el = nodeRefs.current[id];
      if (el) el.setAttribute("transform", `translate(${dx}, ${dy})`);
    }
  };

  const handlePointerUpCanvas = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning) {
      setIsPanning(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
      return;
    }

    // Lasso: select nodes inside the lasso polygon
    if (lassoState) {
      const hitIds = getNodesInLasso(lassoState.points);
      setLassoState(null);
      setActiveTool(null);
      if (lassoState.points.length >= 3) {
        setMultiSelection(hitIds);
      }
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      return;
    }

    // Eraser: reset tool
    if (activeTool === "eraser") {
      setActiveTool(null);
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      return;
    }

    // Rotation: commit rotation value
    if (rotationState) {
      const world = getCanvasWorldPoint(e);
      const dx = world.x - rotationState.center.x;
      const dy = world.y - rotationState.center.y;
      const currentAngle = Math.atan2(dy, dx);
      const deltaDeg = (currentAngle - rotationState.startAngle) * (180 / Math.PI);
      let finalRotation = rotationState.originalRotation + deltaDeg;
      if (e.shiftKey) finalRotation = Math.round(finalRotation / 15) * 15;
      const el = nodeRefs.current[rotationState.nodeId];
      if (el) el.removeAttribute("transform");
      setRotationState(null);
      if (hasParseErrors) return;
      setDocument((prev) => editorMode.type === "component"
        ? updateComponentNodePropertyInSource(prev, editorMode.componentId, rotationState.nodeId, "rotation", finalRotation)
        : updateNodePropertyInSource(prev, rotationState.nodeId, "rotation", finalRotation));
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      return;
    }

    if (draftShape) {
      const isLinear = draftShape.kind === "line" || draftShape.kind === "arrow";
      const isFreehand = draftShape.kind === "freehand";
      const geometry = isFreehand ? normalizeFreehandDraft(draftShape) : isLinear ? normalizeDraftLinear(draftShape) : normalizeDraftBounds(draftShape);
      const newNode = {
        ...createNodeFromRegistry(registry, draftShape.kind, draftShape.id, geometry.x, geometry.y),
        x: geometry.x,
        y: geometry.y,
        w: geometry.w,
        h: geometry.h,
        ...((isLinear || isFreehand) ? { points: (geometry as any).points } : {}),
      };
      if (draftShape.kind === "arrow") {
        const start = draftShape.points?.[0] ?? [draftShape.startX, draftShape.startY];
        const end = draftShape.points?.[draftShape.points.length - 1] ?? [draftShape.currentX, draftShape.currentY];
        const from = findArrowBinding(start[0], start[1]);
        const to = findArrowBinding(end[0], end[1]);
        if (from) (newNode as any).from = from;
        if (to) (newNode as any).to = to;
      }
      setDraftShape(null);
      if (hasParseErrors) return;
      setDocument((prev) => editorMode.type === "component"
        ? insertNodeIntoComponentInSource(prev, editorMode.componentId, newNode)
        : insertRootNodeIntoSource(prev, newNode));
      queueSelection(newNode.id);
      if (draftShape.kind === "sticky") {
        setEditingText({ nodeId: newNode.id, value: String((newNode as any).text ?? "") });
      }
      setActiveTool(null);
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      return;
    }

    if (selectionBox) {
      const hitIds = getNodesInSelectionBox(selectionBox);
      setSelectionBox(null);
      if (selectionBox.additive) {
        setMultiSelection([...selectedIds, ...hitIds], selectedId);
      } else {
        setMultiSelection(hitIds);
      }
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      return;
    }

    if (resizeState && resizePreview) {
      const preview = resizePreview;
      setResizeState(null);
      setResizePreview(null);
      if (hasParseErrors) return;
      const updates: Record<string, any> = {
        x: preview.x,
        y: preview.y,
        w: preview.w,
        h: preview.h,
      };
      if (preview.points) updates.points = preview.points;
      if (resizeState.clearBindings) {
        updates.from = undefined;
        updates.to = undefined;
      }
      setDocument((prev) => editorMode.type === "component"
        ? updateComponentNodePropertiesInSource(prev, editorMode.componentId, resizeState.nodeId, updates)
        : updateNodePropertiesInSource(prev, resizeState.nodeId, updates));
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      return;
    }

    if (linearEditState && resizePreview) {
      const preview = resizePreview;
      const worldPoints = (preview.points || []).map((point) => [preview.x + point[0], preview.y + point[1]] as [number, number]);
      const startPoint = worldPoints[0];
      const endPoint = worldPoints[worldPoints.length - 1];
      const linearNode = view ? findNodeById(view.children, preview.nodeId) : null;
      const from = startPoint ? findArrowBinding(startPoint[0], startPoint[1], linearEditState.nodeId) : null;
      const to = endPoint ? findArrowBinding(endPoint[0], endPoint[1], linearEditState.nodeId) : null;
      const updates: Record<string, any> = {
        x: preview.x,
        y: preview.y,
        w: preview.w,
        h: preview.h,
        points: preview.points,
      };
      if (linearNode?.kind === "arrow") {
        updates.from = from ?? undefined;
        updates.to = to ?? undefined;
      }
      setLinearEditState(null);
      setResizePreview(null);
      if (hasParseErrors) return;
      setDocument((prev) => editorMode.type === "component"
        ? updateComponentNodePropertiesInSource(prev, editorMode.componentId, preview.nodeId, updates)
        : updateNodePropertiesInSource(prev, preview.nodeId, updates));
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      return;
    }
    
    if (!draggingId || !view) return;
    
    const dx = currentDelta.current.x;
    const dy = currentDelta.current.y;
    const idToUpdate = draggingId;
    
    setDraggingId(null);
    const idsToMove = selectedIds.length > 1 && selectedIds.includes(idToUpdate) ? selectedIds : [idToUpdate];
    for (const id of idsToMove) {
      const el = nodeRefs.current[id];
      if (el) {
        el.removeAttribute("transform");
        try { el.releasePointerCapture(e.pointerId); } catch {}
      }
    }
    
    if (dx !== 0 || dy !== 0) {
      if (hasParseErrors) return;
      setDocument((prev) => editorMode.type === "component"
        ? (selectedIds.length > 1 && selectedIds.includes(idToUpdate)
          ? moveComponentNodesInSource(prev, editorMode.componentId, selectedIds, dx, dy)
          : moveComponentNodeInSource(prev, editorMode.componentId, idToUpdate, dx, dy))
        : (selectedIds.length > 1 && selectedIds.includes(idToUpdate)
          ? moveNodesInSource(prev, selectedIds, dx, dy)
          : resolveDragToSource(prev, view, idToUpdate, dx, dy)));
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setCamera((c) => zoomCameraAtPoint(c, mouseX, mouseY, zoomFactor));
    } else {
      setCamera((c) => scrollCamera(c, e.deltaX, e.deltaY));
    }
  };

  const handlePointerDownNode = (e: React.PointerEvent<SVGElement>, nodeId: string) => {
    if (resizeState || linearEditState) return;
    if (editingText && editingText.nodeId !== nodeId) commitInlineTextEdit();

    // Eraser tool: delete node immediately
    if (activeTool === "eraser") {
      e.stopPropagation();
      if (!hasParseErrors) {
        setDocument((prev) => editorMode.type === "component"
          ? deleteComponentNodeFromSource(prev, editorMode.componentId, nodeId)
          : deleteNodeFromSource(prev, nodeId));
      }
      return;
    }

    // Rotation handle: handled separately
    if (rotationState?.nodeId === nodeId) return;

    e.stopPropagation();
    if (e.button === 1 || e.altKey || e.shiftKey) return; // Let canvas handle pan
    if (e.metaKey || e.ctrlKey) {
      toggleSelection(nodeId);
      return;
    }
    if (!selectedIds.includes(nodeId)) queueSelection(nodeId);
    setDraggingId(nodeId);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    currentDelta.current = { x: 0, y: 0 };
  };

  const handleDoubleClickNode = (nodeId: string) => {
    if (activeTool || !view) return;
    const node = findNodeById(view.children, nodeId);
    if (!node || !supportsInlineText(node.kind)) return;
    queueSelection(nodeId);
    setEditingText({ nodeId, value: String(node.text ?? "") });
  };

  const handleResizeStart = (e: React.PointerEvent<SVGElement>, nodeId: string, handle: string) => {
    if (hasParseErrors || !view) return;
    const node = findNodeById(view.children, nodeId);
    if (!node) return;
    queueSelection(nodeId);
    setDraggingId(null);
    setResizeState({
      nodeId,
      handle: handle as ResizeHandle,
      startPointer: { x: e.clientX, y: e.clientY },
      origin: {
        x: Number(node.x ?? 0),
        y: Number(node.y ?? 0),
        w: Math.max(1, Number(node.w ?? 1)),
        h: Math.max(1, Number(node.h ?? 1)),
      },
      originalPoints: Array.isArray((node as any).points) ? JSON.parse(JSON.stringify((node as any).points)) : undefined,
      clearBindings: node.kind === "arrow" && (!!(node as any).from || !!(node as any).to),
    });
    setResizePreview({
      nodeId,
      x: Number(node.x ?? 0),
      y: Number(node.y ?? 0),
      w: Math.max(1, Number(node.w ?? 1)),
      h: Math.max(1, Number(node.h ?? 1)),
      points: Array.isArray((node as any).points) ? JSON.parse(JSON.stringify((node as any).points)) : undefined,
    });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleLinearHandleStart = (e: React.PointerEvent<SVGElement>, nodeId: string, handle: LinearHandle) => {
    if (hasParseErrors || !view) return;
    const node = findNodeById(view.children, nodeId);
    if (!node || !isLinearNode(node)) return;
    const x = Number(node.x ?? 0);
    const y = Number(node.y ?? 0);
    const w = Math.max(1, Number(node.w ?? 1));
    const h = Math.max(1, Number(node.h ?? 1));
    const worldPoints = getRenderedLinearPoints(node, x, y, w, h);
    const frame = worldPointsToFrame(worldPoints);
    queueSelection(nodeId);
    setDraggingId(null);
    setLinearEditState({ nodeId, handle, origin: { x, y, w, h }, points: worldPoints });
    setResizePreview({ nodeId, ...frame });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleInsertNode = (kind: string) => {
    setActiveTool((current) => current === kind ? null : kind);
  };

  const handlePropertyChange = (property: NodePropertyDefinition, rawValue: string) => {
    if (hasParseErrors) return;
    if (!selectedId) return;
    const value = property.type === "number" ? (rawValue === "" ? 0 : Number(rawValue)) : rawValue;
    setDocument((prev) => editorMode.type === "component"
      ? updateComponentNodePropertyInSource(prev, editorMode.componentId, selectedId, property.key, value)
      : updateNodePropertyInSource(prev, selectedId, property.key, value));
  };

  const handleInstanceOverrideChange = (propName: string, rawValue: string) => {
    if (hasParseErrors || !selectedNode?.isInstanceRoot || !selectedId) return;
    const spec = selectedNode.componentProps?.[propName];
    const value = spec?.type === "number" ? (rawValue === "" ? 0 : Number(rawValue)) : rawValue;
    setDocument((prev) => updateInstanceOverrideInSource(prev, selectedId, propName, value));
  };

  const handleExposeSelectedAsProp = () => {
    if (editorMode.type !== "component" || !selectedNode || typeof window === "undefined") return;

    let fieldPath: string | null = null;
    let propType: "string" | "number" | "boolean" | "color" | "image" = "string";
    if (selectedNode.kind === "text" || selectedNode.kind === "sticky") {
      fieldPath = "text";
      propType = "string";
    } else if (selectedNode.kind === "image") {
      fieldPath = "src";
      propType = "image";
    } else if (selectedNode.style?.fill !== undefined) {
      fieldPath = "style.fill";
      propType = "color";
    }

    if (!fieldPath) return;
    const suggested = selectedNode.kind === "text" ? "title" : selectedNode.kind === "image" ? "imageSrc" : "fillColor";
    const propName = window.prompt("Expose as prop", suggested)?.trim();
    if (!propName) return;
    setDocument((prev) => bindComponentNodeFieldToPropInSource(prev, editorMode.componentId, selectedNode.id, fieldPath!, propName, propType));
  };

  const renderNode = (n: ViewerNode): React.ReactNode => {
    const toNum = (v: any, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
    const preview = resizePreview?.nodeId === n.id ? resizePreview : null;
    const x = toNum(preview?.x ?? n.x, 0), y = toNum(preview?.y ?? n.y, 0), w = toNum(preview?.w ?? n.w, 100), h = toNum(preview?.h ?? n.h, 24);
    const sw = n.style?.strokeWidth ?? 1;
    const fill = n.style?.fill ?? "none";
    const stroke = n.style?.stroke ?? "none";
    const corner = n.style?.corner ?? 8;
    const renderNodeValue = preview ? { ...n, points: preview.points ?? (n as any).points, x, y, w, h } : n;

    const isSelected = selectedIds.includes(n.id);
    const isDragging = draggingId === n.id;
    const shouldWrap = !n.instanceRootId || n.isInstanceRoot;
    const isLinear = isLinearNode(n);
    const rotation = Number((n as any).rotation ?? 0);
    const transform = rotation ? `rotate(${rotation}, ${x + w / 2}, ${y + h / 2})` : undefined;
    const linearPoints = isLinear ? getRenderedLinearPoints(renderNodeValue, x, y, w, h) : null;
    const linearOverlay = isSelected && isLinear && linearPoints ? (
      <>
        {linearPoints.map((point, index) => {
          const handle = index === 0 ? "start" : index === linearPoints.length - 1 ? "end" : null;
          if (!handle) return null;
          return (
            <circle
              key={handle}
              cx={point[0]}
              cy={point[1]}
              r={6}
              fill="#ffffff"
              stroke="#2563eb"
              strokeWidth={2}
              style={{ cursor: "move" }}
              onPointerDown={(e) => {
                e.stopPropagation();
                handleLinearHandleStart(e, n.id, handle as LinearHandle);
              }}
            />
          );
        })}
      </>
    ) : null;

    const rotationOverlay = isSelected && isResizableNode(n) && !isLinear ? (
      <g pointerEvents="auto">
        <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y - 24} stroke="#2563eb" strokeWidth={2} />
        <circle cx={x + w / 2} cy={y - 24} r={7} fill="#ffffff" stroke="#2563eb" strokeWidth={2} style={{ cursor: "grab" }}
          onPointerDown={(e) => {
            e.stopPropagation();
            const center = { x: x + w / 2, y: y + h / 2 };
            const startAngle = Math.atan2((e as any).clientY - camera.y - center.y * camera.z, (e as any).clientX - camera.x - center.x * camera.z);
            setRotationState({ nodeId: n.id, startAngle, center, originalRotation: rotation });
          }}
        />
      </g>
    ) : null;

    const definition = registry.get(n.kind);
    if (definition?.render) {
      const rendered = definition.render({
        node: renderNodeValue,
        x,
        y,
        w,
        h,
        fill,
        stroke,
        strokeWidth: sw,
        corner,
        renderChildren: () => <>{n.children?.map(renderNode)}</>,
        resolveNodeById: (id) => (view ? findNodeById(view.children, id) : null),
      });
      if (!shouldWrap) return <React.Fragment key={n.id}>{transform ? <g transform={transform}>{rendered}</g> : rendered}</React.Fragment>;
      const rotatedContent = transform ? <g transform={transform}>{rendered}</g> : rendered;
      return (
        <NodeWrapper key={n.id} nodeId={n.id} x={x} y={y} w={w} h={h} disabled={(activeTool && activeTool !== "eraser") || Boolean(resizeState) || Boolean(linearEditState)} isSelected={isSelected} isDragging={isDragging} canResize={isResizableNode(n) && !isLinear} nodeRefs={nodeRefs} onPointerDown={handlePointerDownNode} onResizeStart={handleResizeStart} onDoubleClick={handleDoubleClickNode} overlay={<>
          {linearOverlay}
          {rotationOverlay}
        </>}>
          {rotatedContent}
        </NodeWrapper>
      );
    }

    if (n.children?.length) {
      const childContent = n.children.map(renderNode);
      const rotatedChildren = transform ? <g transform={transform}>{childContent}</g> : childContent;
      if (!shouldWrap) return <React.Fragment key={n.id}>{rotatedChildren}</React.Fragment>;
      return <NodeWrapper key={n.id} nodeId={n.id} x={x} y={y} w={w} h={h} disabled={(activeTool && activeTool !== "eraser") || Boolean(resizeState) || Boolean(linearEditState)} isSelected={isSelected} isDragging={isDragging} canResize={isResizableNode(n) && !isLinear} nodeRefs={nodeRefs} onPointerDown={handlePointerDownNode} onResizeStart={handleResizeStart} onDoubleClick={handleDoubleClickNode} overlay={<>
        {linearOverlay}
        {rotationOverlay}
      </>}>{rotatedChildren}</NodeWrapper>;
    }

    return null;
  };

  const renderDraftShape = () => {
    if (!draftShape) return null;
    if (draftShape.kind === "freehand") {
      const geometry = normalizeFreehandDraft(draftShape);
      const points = geometry.points.map((point) => `${geometry.x + point[0]},${geometry.y + point[1]}`).join(" ");
      return <polyline points={points} fill="none" stroke="#1d4ed8" strokeWidth={2} strokeDasharray="6 4" pointerEvents="none" strokeLinecap="round" strokeLinejoin="round" />;
    }
    if (draftShape.kind === "line" || draftShape.kind === "arrow") {
      const geometry = normalizeDraftLinear(draftShape);
      const [start, end] = geometry.points;
      const x1 = geometry.x + start[0];
      const y1 = geometry.y + start[1];
      const x2 = geometry.x + end[0];
      const y2 = geometry.y + end[1];
      return <line x1={x1} y1={y1} x2={x2} y2={y2} fill="none" stroke="#1d4ed8" strokeWidth={2} strokeDasharray="6 4" pointerEvents="none" strokeLinecap="round" />;
    }
    const bounds = normalizeDraftBounds(draftShape);
    if (draftShape.kind === "ellipse") return <ellipse cx={bounds.x + bounds.w / 2} cy={bounds.y + bounds.h / 2} rx={bounds.w / 2} ry={bounds.h / 2} fill="#dbeafe88" stroke="#1d4ed8" strokeWidth={2} strokeDasharray="6 4" pointerEvents="none" />;
    if (draftShape.kind === "diamond") return <polygon points={`${bounds.x + bounds.w / 2},${bounds.y} ${bounds.x + bounds.w},${bounds.y + bounds.h / 2} ${bounds.x + bounds.w / 2},${bounds.y + bounds.h} ${bounds.x},${bounds.y + bounds.h / 2}`} fill="#dbeafe88" stroke="#1d4ed8" strokeWidth={2} strokeDasharray="6 4" pointerEvents="none" />;
    return <rect x={bounds.x} y={bounds.y} width={bounds.w} height={bounds.h} fill="#dbeafe88" stroke="#1d4ed8" strokeWidth={2} strokeDasharray="6 4" pointerEvents="none" />;
  };

  const renderSelectionBox = () => {
    if (!selectionBox) return null;
    const bounds = getSelectionBoxBounds(selectionBox);
    return <rect x={bounds.x} y={bounds.y} width={bounds.w} height={bounds.h} fill="#60a5fa22" stroke="#2563eb" strokeWidth={1.5} strokeDasharray="4 4" pointerEvents="none" />;
  };

  const renderLasso = () => {
    if (!lassoState || lassoState.points.length < 2) return null;
    const points = lassoState.points.map(p => `${p[0]},${p[1]}`).join(" ");
    return <polygon points={points} fill="#60a5fa22" stroke="#2563eb" strokeWidth={2} strokeDasharray="6 4" pointerEvents="none" />;
  };

  const canvasCursor = activeTool === "hand" ? "grab" : activeTool === "eraser" ? "pointer" : activeTool ? "crosshair" : "default";
  const editingNode = editingText && view ? findNodeById(view.children, editingText.nodeId) : null;
  const textEditorStyle = editingNode ? {
    position: "absolute",
    left: camera.x + Number(editingNode.x ?? 0) * camera.z,
    top: camera.y + Number(editingNode.y ?? 0) * camera.z,
    width: Math.max(48, Number(editingNode.w ?? 120) * camera.z),
    height: Math.max(32, Number(editingNode.h ?? 48) * camera.z),
    padding: `${Math.max(8, 12 * camera.z)}px`,
    border: "1px solid #a5b4fc",
    borderRadius: `${Math.max(6, 8 * camera.z)}px`,
    outline: "none",
    resize: "none",
    background: "transparent",
    color: String(editingNode.style?.text?.color ?? editingNode.style?.stroke ?? "#1f2937"),
    fontFamily: String(editingNode.style?.text?.font ?? "Inter, sans-serif"),
    fontSize: Math.max(12, Number(editingNode.style?.text?.size ?? 18) * camera.z),
    lineHeight: 1.3,
    textAlign: (editingNode.style?.text?.align ?? "center") as React.CSSProperties["textAlign"],
    opacity: Math.max(0, Math.min(100, Number(editingNode.style?.text?.opacity ?? 100))) / 100,
    zIndex: 20,
    overflow: "hidden",
  } as React.CSSProperties : null;

  const styles: Record<string, React.CSSProperties> = {
    wrap: {
      width: "100vw", height: "100vh", display: "flex", overflow: "hidden", fontFamily: "sans-serif",
    },
    canvasArea: {
      flex: 1, position: "relative", minWidth: 0, background: "#f5f6fa",
    },
    statusBar: {
      position: "absolute",
      left: 24,
      right: 24,
      bottom: 16,
      display: "flex",
      gap: 16,
      alignItems: "center",
      flexWrap: "wrap",
      padding: "10px 14px",
      borderRadius: 10,
      background: "rgba(255,255,255,0.92)",
      border: "1px solid #e2e8f0",
      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
      color: "#475569",
      fontSize: 12,
      zIndex: 10,
      backdropFilter: "blur(6px)",
    },
  };

  return (
    <div style={styles.wrap}>
      <CodeEditorPanel open={showCode} src={src} errors={parseErrors} onChangeSrc={setDocument} onClose={() => setShowCode(false)} onRebuild={rebuild} onToggle={() => setShowCode((v) => !v)} />

      <div style={styles.canvasArea}>
        <Toolbar
          tools={toolbarTools}
          onInsert={handleInsertNode}
          activeToolKind={activeTool}
          actions={[
            { key: "hand", label: "✋ Hand", active: activeTool === "hand", onClick: () => setActiveTool("hand") },
            { key: "select", label: "↖ Select", active: !activeTool, onClick: () => setActiveTool(null) },
            { key: "eraser", label: "🧹 Eraser", active: activeTool === "eraser", onClick: () => setActiveTool("eraser") },
            { key: "lasso", label: "⬺ Lasso", active: activeTool === "lasso", onClick: () => setActiveTool("lasso") },
            { key: "code", label: showCode ? "Hide Code" : "Show Code", onClick: () => setShowCode((open) => !open) },
            ...(editorMode.type === "component"
              ? [{ key: "back-document", label: "Back To Document", onClick: () => { setEditorMode({ type: "document" }); clearSelection(); } }]
              : []),
            { key: "undo", label: "Undo", disabled: !canUndo, onClick: undo },
            { key: "redo", label: "Redo", disabled: !canRedo, onClick: redo },
            { key: "zoom-out", label: "Zoom -", onClick: () => zoomBy(0.9) },
            { key: "zoom-in", label: "Zoom +", onClick: () => zoomBy(1.1) },
            { key: "copy", label: "Copy", disabled: !selectedId || selectedIds.length !== 1 || hasParseErrors, onClick: () => {
              if (!selectedId) return;
              clipboardRef.current = copyNodeFromSource(src, selectedId);
            } },
            { key: "paste", label: "Paste", disabled: !clipboardRef.current || hasParseErrors, onClick: () => {
              if (!clipboardRef.current) return;
              setDocument((prev) => {
                const result = pasteNodeIntoSource(prev, clipboardRef.current);
                if (result.pastedId) queueSelection(result.pastedId);
                return result.src;
              });
            } },
            { key: "duplicate", label: "Duplicate", disabled: !selectedId || selectedIds.length !== 1 || hasParseErrors, onClick: () => {
              if (!selectedId) return;
              setDocument((prev) => {
                const result = duplicateNodeInSource(prev, selectedId);
                if (result.duplicatedId) queueSelection(result.duplicatedId);
                return result.src;
              });
            } },
            { key: "delete", label: "Delete", disabled: !selectedIds.length || hasParseErrors, onClick: () => {
              if (!selectedIds.length) return;
              setDocument((prev) => editorMode.type === "component"
                ? (selectedIds.length === 1 && selectedId ? deleteComponentNodeFromSource(prev, editorMode.componentId, selectedId) : deleteComponentNodesFromSource(prev, editorMode.componentId, selectedIds))
                : (selectedIds.length === 1 && selectedId ? deleteNodeFromSource(prev, selectedId) : deleteNodesFromSource(prev, selectedIds)));
              clearSelection();
            } },
            { key: "create-component", label: "Create Component", disabled: editorMode.type === "component" || !selectedId || selectedIds.length !== 1 || hasParseErrors, onClick: () => {
              if (!selectedId || typeof window === "undefined") return;
              const componentName = window.prompt("Component name", "NewComponent")?.trim();
              if (!componentName) return;
              const semanticRole = window.prompt("Component role (optional)", "")?.trim() || undefined;
              setDocument((prev) => {
                const result = createComponentFromNodeInSource(prev, selectedId, componentName, semanticRole);
                if (result.instanceId) queueSelection(result.instanceId);
                return result.src;
              });
            } },
            { key: "edit-component", label: "Edit Component", disabled: editorMode.type === "component" || selectedIds.length !== 1 || !selectedNode?.isInstanceRoot || !selectedNode.componentId, onClick: () => {
              if (!selectedNode?.componentId) return;
              setEditorMode({ type: "component", componentId: selectedNode.componentId });
              clearSelection();
            } },
            { key: "expose-prop", label: "Expose Prop", disabled: editorMode.type !== "component" || !selectedNode || (!(["text", "sticky", "image"].includes(selectedNode.kind)) && selectedNode.style?.fill === undefined), onClick: handleExposeSelectedAsProp },
            { key: "focus-selected", label: "Focus Selected", disabled: !selectedNode, onClick: focusSelectedNode },
            { key: "reset-view", label: "Reset View", onClick: () => setCamera(createDefaultCamera()) },
            { key: "fit-view", label: "Fit View", disabled: !view, onClick: fitViewToScene },
            { key: "import", label: "Import", onClick: () => fileInputRef.current?.click() },
            { key: "export", label: "Export", onClick: handleDownloadWFML },
            { key: "new", label: "New", onClick: () => {
              clearSelection();
              setDraggingId(null);
              clipboardRef.current = null;
              setCamera(createDefaultCamera());
              setDocument(SAMPLE);
            } },
          ]}
        />

        <input ref={fileInputRef} type="file" accept=".wfml,.txt,text/plain" style={{ display: "none" }} onChange={handleImportWFML} />

        <PropertyInspectorPanel selectedNode={selectedNode} definition={selectedDefinition} editingTextNodeId={editingText?.nodeId ?? null} onChangeProperty={handlePropertyChange} onChangeInstanceOverride={handleInstanceOverrideChange} />

        {editingText && editingNode && textEditorStyle ? (
          <textarea
            autoFocus
            value={editingText.value}
            onChange={(e) => setEditingText({ nodeId: editingText.nodeId, value: e.target.value })}
            onBlur={() => commitInlineTextEdit()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setEditingText(null);
              }
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                commitInlineTextEdit();
              }
            }}
            style={textEditorStyle}
          />
        ) : null}

        {!view ? (
          <div style={{ color: "#64748b" }}>No parse result.</div>
        ) : (
          <CanvasShell camera={camera} isPanning={isPanning} cursor={canvasCursor} onPointerDown={handlePointerDownCanvas} onPointerMove={handlePointerMoveCanvas} onPointerUp={handlePointerUpCanvas} onPointerLeave={handlePointerUpCanvas} onWheel={handleWheel}>
            {view.children.map(renderNode)}
            {renderDraftShape()}
            {renderSelectionBox()}
            {renderLasso()}
          </CanvasShell>
        )}

        <div style={styles.statusBar}>
          <span>{editorMode.type === "component" ? `Mode: Component ${activeComponent?.name || editorMode.componentId}` : "Mode: Document"}</span>
          <span>Zoom {zoomPercent}%</span>
          <span>{selectedIds.length > 1 ? `${selectedIds.length} selected` : selectedId ? `Selected #${selectedId}` : activeTool ? `Tool: ${activeTool}` : "Tool: select"}</span>
          <span>{hasParseErrors ? `${parseErrors.length} parse error(s)` : "WFML valid"}</span>
          <span>Shortcuts: Cmd/Ctrl+Z, D, C, V, E</span>
        </div>
      </div>
    </div>
  );
}

