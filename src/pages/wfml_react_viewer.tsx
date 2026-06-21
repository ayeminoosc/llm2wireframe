// src/components/WFMLReactViewerInline.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";

import { applyDragToSource, applyDragToView, insertRootNodeIntoSource, updateNodePropertyInSource } from "../engine/commands";
import { getViewportCenterWorldPoint, panCamera, scrollCamera, zoomCameraAtPoint, type Camera } from "../engine/camera";
import { layoutDoc } from "../engine/layout";
import { createNodeFromRegistry, createNodeRegistry, getToolDefinitions, type NodePropertyDefinition } from "../engine/registry";
import { findNodeById, mapDoc, type ViewerDoc, type ViewerNode } from "../engine/scene";
import { parseWFML } from "../parser/wfml-grammar-parser-emitter";
import { primitiveNodeDefinitions } from "../core-library/primitives";
import { CanvasShell } from "../studio/components/CanvasShell";
import { NodeWrapper } from "../studio/components/NodeWrapper";
import { Toolbar } from "../studio/components/Toolbar";
import { CodeEditorPanel } from "../studio/panels/CodeEditorPanel";
import { PropertyInspectorPanel } from "../studio/panels/PropertyInspectorPanel";

export default function WFMLReactViewerInline({
  initialText,
  height = "100vh",
}: { initialText?: string; height?: number | string }) {
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

  const [src, setSrc] = useState(SAMPLE);
  const [parseErrors, setParseErrors] = useState<any[]>([]);
  const parsed = useMemo(() => parseWFML(src), [src]);
  const [view, setView] = useState<ViewerDoc | null>(null);
  
  // Interactive state
  const [showCode, setShowCode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  
  // Camera State
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, z: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const registry = useMemo(() => createNodeRegistry(primitiveNodeDefinitions), []);
  const toolbarTools = useMemo(() => getToolDefinitions(registry), [registry]);
  const selectedNode = useMemo(() => (view ? findNodeById(view.children, selectedId) : null), [view, selectedId]);
  const selectedDefinition = useMemo(() => (selectedNode ? registry.get(selectedNode.kind) : undefined), [registry, selectedNode]);

  const nodeRefs = useRef<Record<string, SVGGElement | null>>({});
  const dragStartPos = useRef({ x: 0, y: 0 });
  const currentDelta = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const { doc, errors } = parsed as any;
    setParseErrors(errors || []);
    if (!doc) { setView(null); return; }
    setView(layoutDoc(mapDoc(doc)));
  }, [parsed]);

  const rebuild = () => {
    const { doc, errors } = parseWFML(src) as any;
    setParseErrors(errors || []);
    if (!doc) return;
    setView(layoutDoc(mapDoc(doc)));
  };

  const handlePointerDownCanvas = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button === 1 || e.altKey || e.shiftKey) { // Middle click or Alt/Shift pan
      setIsPanning(true);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    setSelectedId(null);
  };

  const handlePointerMoveCanvas = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning) {
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      setCamera((c) => panCamera(c, dx, dy));
      return;
    }
    
    if (!draggingId) return;
    const dx = (e.clientX - dragStartPos.current.x) / camera.z;
    const dy = (e.clientY - dragStartPos.current.y) / camera.z;
    currentDelta.current = { x: dx, y: dy };
    
    const el = nodeRefs.current[draggingId];
    if (el) el.setAttribute("transform", `translate(${dx}, ${dy})`);
  };

  const handlePointerUpCanvas = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning) {
      setIsPanning(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
      return;
    }
    
    if (!draggingId || !view) return;
    
    const dx = currentDelta.current.x;
    const dy = currentDelta.current.y;
    const idToUpdate = draggingId;
    
    setDraggingId(null);
    const el = nodeRefs.current[idToUpdate];
    if (el) {
      el.removeAttribute("transform");
      try { el.releasePointerCapture(e.pointerId); } catch {}
    }
    
    if (dx !== 0 || dy !== 0) {
      setView(applyDragToView(view, idToUpdate, dx, dy));
      setSrc((prev) => applyDragToSource(prev, idToUpdate, dx, dy));
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
    e.stopPropagation();
    if (e.button === 1 || e.altKey || e.shiftKey) return; // Let canvas handle pan
    setSelectedId(nodeId);
    setDraggingId(nodeId);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    currentDelta.current = { x: 0, y: 0 };
  };

  const handleInsertNode = (kind: string) => {
    try {
      const id = `${kind}-${Math.floor(Math.random() * 10000)}`;
      const world = getViewportCenterWorldPoint(camera, window.innerWidth, window.innerHeight);
      const newNode = createNodeFromRegistry(registry, kind, id, Math.round(world.x), Math.round(world.y));
      setSrc((prev) => insertRootNodeIntoSource(prev, newNode));
    } catch (e) {
      console.error("Failed to insert node", e);
    }
  };

  const handlePropertyChange = (property: NodePropertyDefinition, rawValue: string) => {
    if (!selectedId) return;
    const value = property.type === "number" ? (rawValue === "" ? 0 : Number(rawValue)) : rawValue;
    setSrc((prev) => updateNodePropertyInSource(prev, selectedId, property.key, value));
  };

  const renderNode = (n: ViewerNode): React.ReactNode => {
    const toNum = (v: any, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
    const x = toNum(n.x, 0), y = toNum(n.y, 0), w = toNum(n.w, 100), h = toNum(n.h, 24);
    const sw = n.style?.strokeWidth ?? 1;
    const fill = n.style?.fill ?? (n.kind === "rect" || n.kind === "frame" ? "#fff" : "none");
    const stroke = n.style?.stroke ?? (n.kind === "flex" ? "none" : "#1e293b22");
    const corner = n.style?.corner ?? 8;

    const isSelected = selectedId === n.id;
    const isDragging = draggingId === n.id;

    const definition = registry.get(n.kind);
    if (definition?.render) {
      return (
        <NodeWrapper key={n.id} nodeId={n.id} x={x} y={y} w={w} h={h} isSelected={isSelected} isDragging={isDragging} nodeRefs={nodeRefs} onPointerDown={handlePointerDownNode}>
          {definition.render({
            node: n,
            x,
            y,
            w,
            h,
            fill,
            stroke,
            strokeWidth: sw,
            corner,
            renderChildren: () => <>{n.children?.map(renderNode)}</>,
          })}
        </NodeWrapper>
      );
    }

    if (n.children?.length) {
      return <NodeWrapper key={n.id} nodeId={n.id} x={x} y={y} w={w} h={h} isSelected={isSelected} isDragging={isDragging} nodeRefs={nodeRefs} onPointerDown={handlePointerDownNode}>{n.children.map(renderNode)}</NodeWrapper>;
    }

    return null;
  };

  const styles: Record<string, React.CSSProperties> = {
    wrap: {
      width: "100vw", height: "100vh", position: "fixed", top: 0, left: 0,
      background: "#f5f6fa", overflow: "hidden", fontFamily: "sans-serif"
    },
    floatingBtn: {
      position: "absolute", top: 24, right: 24, zIndex: 10,
      padding: "8px 16px", borderRadius: 8, border: "none", background: "#2B59FF", color: "#fff", cursor: "pointer", fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
    },
  };

  return (
    <div style={styles.wrap}>
      <Toolbar tools={toolbarTools} onInsert={handleInsertNode} />

      {/* Floating Action Button for Code */}
      {!showCode && (
        <button style={styles.floatingBtn} onClick={() => setShowCode(true)}>
          {`</> Edit WFML`}
        </button>
      )}

      <PropertyInspectorPanel selectedNode={selectedNode} definition={selectedDefinition} onChangeProperty={handlePropertyChange} />

      <CodeEditorPanel open={showCode} src={src} errors={parseErrors} onChangeSrc={setSrc} onClose={() => setShowCode(false)} onRebuild={rebuild} />

      {!view ? (
        <div style={{ color: "#64748b" }}>No parse result.</div>
      ) : (
        <CanvasShell camera={camera} isPanning={isPanning} onPointerDown={handlePointerDownCanvas} onPointerMove={handlePointerMoveCanvas} onPointerUp={handlePointerUpCanvas} onPointerLeave={handlePointerUpCanvas} onWheel={handleWheel}>
          {view.children.map(renderNode)}
        </CanvasShell>
      )}
    </div>
  );
}

