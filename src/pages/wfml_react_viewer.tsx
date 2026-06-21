// src/components/WFMLReactViewerInline.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";

import { applyDragToView, copyNodeFromSource, deleteNodeFromSource, duplicateNodeInSource, insertRootNodeIntoSource, pasteNodeIntoSource, resolveDragToSource, updateNodePropertyInSource } from "../engine/commands";
import { createDefaultCamera, fitCameraToBounds, getViewportCenterWorldPoint, panCamera, scrollCamera, zoomCameraAtPoint, type Camera } from "../engine/camera";
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
  
  // Interactive state
  const [showCode, setShowCode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  
  // Camera State
  const [camera, setCamera] = useState<Camera>(createDefaultCamera());
  const [isPanning, setIsPanning] = useState(false);
  const clipboardRef = useRef<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const registry = useMemo(() => createNodeRegistry(primitiveNodeDefinitions), []);
  const toolbarTools = useMemo(() => getToolDefinitions(registry), [registry]);
  const selectedNode = useMemo(() => (view ? findNodeById(view.children, selectedId) : null), [view, selectedId]);
  const selectedDefinition = useMemo(() => (selectedNode ? registry.get(selectedNode.kind) : undefined), [registry, selectedNode]);
  const hasParseErrors = parseErrors.length > 0;

  const nodeRefs = useRef<Record<string, SVGGElement | null>>({});
  const dragStartPos = useRef({ x: 0, y: 0 });
  const currentDelta = useRef({ x: 0, y: 0 });

  const zoomPercent = Math.round(camera.z * 100);

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
      if (selectedId && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        if (hasParseErrors || !view) return;
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const dx = event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0;
        const dy = event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0;
        setDocument((prev) => resolveDragToSource(prev, view, selectedId, dx, dy));
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedId(null);
        setDraggingId(null);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c" && selectedId) {
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
          if (result.pastedId) setSelectedId(result.pastedId);
          return result.src;
        });
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d" && selectedId) {
        if (hasParseErrors) return;
        event.preventDefault();
        setDocument((prev) => {
          const result = duplicateNodeInSource(prev, selectedId);
          if (result.duplicatedId) setSelectedId(result.duplicatedId);
          return result.src;
        });
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        if (hasParseErrors) return;
        event.preventDefault();
        setDocument((prev) => deleteNodeFromSource(prev, selectedId));
        setSelectedId(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hasParseErrors, redo, selectedId, setDocument, src, undo, view]);

  useEffect(() => {
    const { doc, errors } = parsed as any;
    setParseErrors(errors || []);
    if (!doc) { setView(null); return; }
    setView(layoutDoc(mapDoc(doc)));
  }, [parsed]);

  useEffect(() => {
    if (selectedId && !selectedNode) {
      setSelectedId(null);
      setDraggingId(null);
    }
  }, [selectedId, selectedNode]);

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
    setSelectedId(null);
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
      if (hasParseErrors) return;
      setDocument((prev) => resolveDragToSource(prev, view, idToUpdate, dx, dy));
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
    if (hasParseErrors) return;
    try {
      const id = `${kind}-${Math.floor(Math.random() * 10000)}`;
      const world = getViewportCenterWorldPoint(camera, window.innerWidth, window.innerHeight);
      const newNode = createNodeFromRegistry(registry, kind, id, Math.round(world.x), Math.round(world.y));
      setDocument((prev) => insertRootNodeIntoSource(prev, newNode));
    } catch (e) {
      console.error("Failed to insert node", e);
    }
  };

  const handlePropertyChange = (property: NodePropertyDefinition, rawValue: string) => {
    if (hasParseErrors) return;
    if (!selectedId) return;
    const value = property.type === "number" ? (rawValue === "" ? 0 : Number(rawValue)) : rawValue;
    setDocument((prev) => updateNodePropertyInSource(prev, selectedId, property.key, value));
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
      <Toolbar
        tools={toolbarTools}
        onInsert={handleInsertNode}
        actions={[
          { key: "undo", label: "Undo", disabled: !canUndo, onClick: undo },
          { key: "redo", label: "Redo", disabled: !canRedo, onClick: redo },
          { key: "zoom-out", label: "Zoom -", onClick: () => zoomBy(0.9) },
          { key: "zoom-in", label: "Zoom +", onClick: () => zoomBy(1.1) },
          { key: "copy", label: "Copy", disabled: !selectedId || hasParseErrors, onClick: () => {
            if (!selectedId) return;
            clipboardRef.current = copyNodeFromSource(src, selectedId);
          } },
          { key: "paste", label: "Paste", disabled: !clipboardRef.current || hasParseErrors, onClick: () => {
            if (!clipboardRef.current) return;
            setDocument((prev) => {
              const result = pasteNodeIntoSource(prev, clipboardRef.current);
              if (result.pastedId) setSelectedId(result.pastedId);
              return result.src;
            });
          } },
          { key: "duplicate", label: "Duplicate", disabled: !selectedId || hasParseErrors, onClick: () => {
            if (!selectedId) return;
            setDocument((prev) => {
              const result = duplicateNodeInSource(prev, selectedId);
              if (result.duplicatedId) setSelectedId(result.duplicatedId);
              return result.src;
            });
          } },
          { key: "delete", label: "Delete", disabled: !selectedId || hasParseErrors, onClick: () => {
            if (!selectedId) return;
            setDocument((prev) => deleteNodeFromSource(prev, selectedId));
            setSelectedId(null);
          } },
          { key: "focus-selected", label: "Focus Selected", disabled: !selectedNode, onClick: focusSelectedNode },
          { key: "reset-view", label: "Reset View", onClick: () => setCamera(createDefaultCamera()) },
          { key: "fit-view", label: "Fit View", disabled: !view, onClick: fitViewToScene },
          { key: "import", label: "Import", onClick: () => fileInputRef.current?.click() },
          { key: "export", label: "Export", onClick: handleDownloadWFML },
          { key: "new", label: "New", onClick: () => {
            setSelectedId(null);
            setDraggingId(null);
            clipboardRef.current = null;
            setCamera(createDefaultCamera());
            setDocument(SAMPLE);
          } },
          { key: "code", label: showCode ? "Hide Code" : "Show Code", onClick: () => setShowCode((open) => !open) },
        ]}
      />

      {/* Floating Action Button for Code */}
      {!showCode && (
        <button style={styles.floatingBtn} onClick={() => setShowCode(true)}>
          {`</> Edit WFML`}
        </button>
      )}

      <input ref={fileInputRef} type="file" accept=".wfml,.txt,text/plain" style={{ display: "none" }} onChange={handleImportWFML} />

      <PropertyInspectorPanel selectedNode={selectedNode} definition={selectedDefinition} onChangeProperty={handlePropertyChange} />

      <CodeEditorPanel open={showCode} src={src} errors={parseErrors} onChangeSrc={setDocument} onClose={() => setShowCode(false)} onRebuild={rebuild} />

      {!view ? (
        <div style={{ color: "#64748b" }}>No parse result.</div>
      ) : (
        <CanvasShell camera={camera} isPanning={isPanning} onPointerDown={handlePointerDownCanvas} onPointerMove={handlePointerMoveCanvas} onPointerUp={handlePointerUpCanvas} onPointerLeave={handlePointerUpCanvas} onWheel={handleWheel}>
          {view.children.map(renderNode)}
        </CanvasShell>
      )}

      <div style={styles.statusBar}>
        <span>Zoom {zoomPercent}%</span>
        <span>{selectedId ? `Selected #${selectedId}` : "No selection"}</span>
        <span>{hasParseErrors ? `${parseErrors.length} parse error(s)` : "WFML valid"}</span>
        <span>Shortcuts: Cmd/Ctrl+Z, D, C, V, E</span>
      </div>
    </div>
  );
}

