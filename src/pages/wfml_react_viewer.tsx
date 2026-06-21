// src/components/WFMLReactViewerInline.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";

// ⬇️ Adjust this to your parser location
import { parseWFML, emitWFML } from "../parser/wfml-grammar-parser-emitter";

// ---- Lightweight viewer types ----
type PlacementRule =
  | { type: "below"; ref: string; by?: number }
  | { type: "above"; ref: string; by?: number }
  | { type: "rightOf"; ref: string; by?: number }
  | { type: "leftOf"; ref: string; by?: number }
  | { type: "centerX"; ref?: string }
  | { type: "centerY"; ref?: string }
  | { type: "centered"; ref?: string }
  | { type: "alignLeft"; ref: string }
  | { type: "alignRight"; ref: string }
  | { type: "alignTop"; ref: string }
  | { type: "alignBottom"; ref: string }
  | { type: "inside"; ref: string; inset?: number | [number, number, number, number] };

type ViewerNode = {
  kind: string; // Dynamic for plugins
  id: string;
  x?: number; y?: number; w?: number | "fill" | "hug" | "auto"; h?: number | "fill" | "hug" | "auto";
  text?: string; src?: string;
  style?: {
    fill?: string; stroke?: string; strokeWidth?: number; corner?: number;
    text?: { size?: number; weight?: number; align?: "left" | "center" | "right" }
  };
  place?: PlacementRule[];
  // Flex layout props
  direction?: "row" | "column";
  gap?: number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  padding?: number;
  children?: ViewerNode[];
};

type ViewerFrame = { id: string; name?: string; w: number; h: number; style?: any; children: ViewerNode[] };
type ViewerDoc = { pages: { id: string; name: string; frames: ViewerFrame[] }[] };

export default function WFMLReactViewerInline({
  initialText,
  height = "100vh",
}: { initialText?: string; height?: number | string }) {
  const SAMPLE = initialText ?? `meta:
  version: 0.1
  author: you

page Auth:
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

  const handlePointerDown = (e: React.PointerEvent<SVGElement>, nodeId: string) => {
    e.stopPropagation();
    setSelectedId(nodeId);
    setDraggingId(nodeId);
    
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    currentDelta.current = { x: 0, y: 0 };
    
    (e.target as SVGElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGElement>) => {
    if (!draggingId) return;
    
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    currentDelta.current = { x: dx, y: dy };
    
    // Fast DOM update without React state re-render
    const el = nodeRefs.current[draggingId];
    if (el) {
      el.setAttribute("transform", `translate(${dx}, ${dy})`);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGElement>) => {
    if (!draggingId || !view) return;
    (e.target as SVGElement).releasePointerCapture(e.pointerId);
    
    const dx = currentDelta.current.x;
    const dy = currentDelta.current.y;
    const idToUpdate = draggingId;
    
    // Reset dragging state and clear DOM transform immediately
    setDraggingId(null);
    const el = nodeRefs.current[idToUpdate];
    if (el) el.removeAttribute("transform");
    
    // Only if we actually moved do we commit the change to React state
    if (dx !== 0 || dy !== 0) {
      const newView = JSON.parse(JSON.stringify(view));
      const updateNodePos = (nodes: ViewerNode[]): boolean => {
        for (const n of nodes) {
          if (n.id === idToUpdate) {
            n.x = (n.x || 0) + dx;
            n.y = (n.y || 0) + dy;
            // Strip place rules so it stays where dropped
            n.place = []; 
            return true;
          }
          if (n.children && updateNodePos(n.children)) return true;
        }
        return false;
      };

      for (const page of newView.pages) {
        for (const frame of page.frames) {
          if (updateNodePos(frame.children)) break;
        }
      }
      setView(newView);
      
      // TODO: Phase 2 - Trigger Inverse Layout Solver here and emitWFML
    }
  };

  const handleInsertNode = (kind: string) => {
    try {
      const res = parseWFML(src) as any;
      const doc = res.doc;
      if (!doc) return;
      
      if (!doc.pages || doc.pages.length === 0) {
        doc.pages = [{ kind: "page", id: "page1", name: "Page 1", frames: [] }];
      }
      const page = doc.pages[0];
      if (!page.frames || page.frames.length === 0) {
        page.frames = [{ kind: "frame", id: "frame1", name: "Frame 1", w: 390, h: 844, children: [] }];
      }
      
      const frame = page.frames[0];
      if (!frame.children) frame.children = [];
      
      const id = `${kind}-${Math.floor(Math.random() * 10000)}`;
      const newNode: any = { kind, id, x: 50, y: 50 };
      
      if (kind === "rect" || kind === "flex") { newNode.w = 100; newNode.h = 100; }
      if (kind === "text") { newNode.text = "New Text"; }
      if (kind === "image") { newNode.src = "https://dummyimage.com/100x100/2b59ff/ffffff.png&text=Img"; newNode.w = 100; newNode.h = 100; }
      
      frame.children.push(newNode);
      const newSrc = emitWFML(doc);
      setSrc(newSrc);
      
      // Automatically show the code panel so the user sees the update
      setShowCode(true);
    } catch (e) {
      console.error("Failed to insert node", e);
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    wrap: {
      width: "100vw", height: "100vh", position: "fixed", top: 0, left: 0,
      background: "#f5f6fa", overflow: "hidden", fontFamily: "sans-serif"
    },
    canvas: {
      width: "100%", height: "100%", overflow: "auto", position: "absolute", top: 0, left: 0,
      display: "flex", alignItems: "center", justifyContent: "center"
    },
    toolbar: {
      position: "absolute", top: 24, left: "50%", transform: "translateX(-50%)",
      display: "flex", gap: 8, padding: 8, background: "#fff", borderRadius: 8,
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 10
    },
    toolBtn: {
      padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer", borderRadius: 4, fontWeight: 600, color: "#475569"
    },
    floatingBtn: {
      position: "absolute", top: 24, right: 24, zIndex: 10,
      padding: "8px 16px", borderRadius: 8, border: "none", background: "#2B59FF", color: "#fff", cursor: "pointer", fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
    },
    codePanel: {
      position: "absolute", top: 0, right: showCode ? 0 : "-400px", width: 400, height: "100%",
      background: "#fff", boxShadow: "-2px 0 20px rgba(0,0,0,0.15)", transition: "right 0.3s ease",
      display: "flex", flexDirection: "column", zIndex: 20
    },
    codeHeader: {
      padding: 16, borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center"
    },
    textarea: {
      flex: 1, border: "none", outline: "none", padding: 16,
      fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 12, resize: "none", width: "100%", boxSizing: "border-box"
    },
    error: { padding: 16, color: "#b91c1c", background: "#fef2f2", fontSize: 12, fontFamily: "ui-monospace, Menlo, Consolas, monospace", overflow: "auto", maxHeight: 200 },
    title: { margin: 0, fontSize: 16, fontWeight: 700 },
    frameWrap: { display: "inline-block", background: "#fff", boxShadow: "0 8px 30px rgba(0,0,0,0.08)", borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0" },
    svg: { display: "block", background: "#fff" }
  };

  return (
    <div style={styles.wrap}>
      {/* Floating Toolbar */}
      <div style={styles.toolbar}>
        <button style={styles.toolBtn} onClick={() => handleInsertNode('rect')}>▱ Rect</button>
        <button style={styles.toolBtn} onClick={() => handleInsertNode('text')}>T Text</button>
        <button style={styles.toolBtn} onClick={() => handleInsertNode('image')}>🖼 Image</button>
        <button style={styles.toolBtn} onClick={() => handleInsertNode('flex')}>◫ Flex</button>
      </div>

      {/* Floating Action Button for Code */}
      {!showCode && (
        <button style={styles.floatingBtn} onClick={() => setShowCode(true)}>
          {`</> Edit WFML`}
        </button>
      )}

      {/* Code Sidebar */}
      <div style={styles.codePanel}>
        <div style={styles.codeHeader}>
          <h2 style={styles.title}>WFML Editor</h2>
          <button style={{...styles.toolBtn, padding: "4px 8px"}} onClick={() => setShowCode(false)}>Close</button>
        </div>
        <textarea style={styles.textarea} value={src} onChange={(e) => setSrc(e.target.value)} spellCheck={false} />
        {parseErrors.length ? <div style={styles.error}>{parseErrors.map((e: any) => `L${e.line}: ${e.message}`).join("\n")}</div> : null}
        <button type="button" style={{...styles.floatingBtn, position: "relative", top: 0, right: 0, margin: 16, width: "calc(100% - 32px)"}} onClick={rebuild}>Re-render</button>
      </div>

      {/* MAIN CANVAS */}
      <div style={styles.canvas} onPointerDown={() => setSelectedId(null)}>
        {!view ? (
          <div style={{ color: "#64748b" }}>No parse result.</div>
        ) : (
          view.pages.map((p) => (
            <div key={p.id} style={{ padding: 80, display: "flex", gap: 60, flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start", minHeight: "100%", boxSizing: "border-box" }}>
              {p.frames.map((f) => (
                <div key={f.id} style={styles.frameWrap}>
                  <svg 
                    width={f.w} height={f.h} 
                    style={styles.svg}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                  >
                    {f.style?.fill && <rect x={0} y={0} width={f.w} height={f.h} fill={f.style.fill} />}
                    {f.children.map(function renderNode(n): React.ReactNode {
                      const toNum = (v: any, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
                      const x = toNum(n.x, 0), y = toNum(n.y, 0), w = toNum(n.w, 100), h = toNum(n.h, 24);
                      const sw = n.style?.strokeWidth ?? 1;
                      const fill = n.style?.fill ?? (n.kind === "rect" ? "#fff" : "none");
                      const stroke = n.style?.stroke ?? (n.kind === "flex" ? "none" : "#1e293b22");
                      const corner = n.style?.corner ?? 8;
                      
                      const isSelected = selectedId === n.id;
                      const isDragging = draggingId === n.id;
                      
                      const Wrapper = ({ children }: { children: React.ReactNode }) => (
                        <g 
                           key={n.id} 
                           ref={(el) => { nodeRefs.current[n.id] = el; }}
                           onPointerDown={(e) => handlePointerDown(e, n.id)}
                           style={{ cursor: isDragging ? "grabbing" : "grab", opacity: isDragging ? 0.8 : 1 }}
                        >
                          {children}
                          {isSelected && (
                            <rect x={x} y={y} width={w} height={h} fill="none" stroke="#3b82f6" strokeWidth={2} style={{ pointerEvents: 'none' }} />
                          )}
                        </g>
                      );

                      if (n.kind === "flex") {
                        return (
                          <Wrapper key={n.id}>
                            {fill !== "none" && <rect x={x} y={y} width={w} height={h} rx={corner} ry={corner} fill={fill} stroke={stroke} strokeWidth={sw} />}
                            {n.children?.map(renderNode)}
                          </Wrapper>
                        );
                      }

                      if (n.kind === "rect") {
                        if (n.children?.length) {
                          return (
                            <Wrapper key={n.id}>
                              <rect x={x} y={y} width={w} height={h} rx={corner} ry={corner} fill={fill} stroke={stroke} strokeWidth={sw} />
                              {n.children.map(renderNode)}
                            </Wrapper>
                          );
                        }
                        return (
                          <Wrapper key={n.id}>
                            <rect x={x} y={y} width={w} height={h} rx={corner} ry={corner} fill={fill} stroke={stroke} strokeWidth={sw} />
                          </Wrapper>
                        );
                      }

                      if (n.kind === "image")
                        return (
                          <Wrapper key={n.id}>
                            <image x={x} y={y} width={w} height={h} href={n.src} preserveAspectRatio="xMidYMid meet" />
                          </Wrapper>
                        );

                      // text
                      if (n.kind === "text") {
                        const txtSize = n.style?.text?.size ?? 14;
                        const weight = n.style?.text?.weight ?? 600;
                        const align = n.style?.text?.align ?? "center";
                        const padX = 8;
                        const txt = n.text || "";
                        const estW = Math.max(w, txt.length * (txtSize * 0.6) + padX * 2);
                        const anchor = align === "center" ? "middle" : align === "left" ? "start" : "end";
                        const tx = align === "center" ? x + estW / 2 : align === "left" ? x + padX : x + estW - padX;
                        const ty = y + h / 2 + txtSize * 0.35;
                        return (
                          <Wrapper key={n.id}>
                            <text x={tx} y={ty} textAnchor={anchor} fontSize={txtSize} fontWeight={weight} fill="#0f172a">{txt}</text>
                          </Wrapper>
                        );
                      }
                      
                      return null;
                    })}
                  </svg>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---- Map real AST → viewer types ----
function mapDoc(astDoc: any): ViewerDoc {
  const out: ViewerDoc = { pages: [] };
  for (const p of astDoc.pages || []) {
    const page = { id: slug(p.name || p.id), name: p.name || p.id, frames: [] as ViewerFrame[] };
    for (const f of p.frames || []) {
      const frame: ViewerFrame = { id: f.id, name: f.name, w: f.w || 0, h: f.h || 0, style: f.style, children: [] };
      const mapNode = (n: any): ViewerNode => {
        const mapped: ViewerNode = {
          kind: n.kind, id: n.id, x: n.x, y: n.y, w: n.w, h: n.h,
          text: n.text, src: n.src,
          style: { fill: n.style?.fill, stroke: n.style?.stroke, strokeWidth: n.style?.strokeWidth, corner: n.style?.corner, text: n.style?.text },
          place: n.place as PlacementRule[] | undefined,
        };
        if (n.kind === "flex") {
          mapped.direction = n.direction || "column";
          mapped.gap = n.gap || 0;
          mapped.align = n.align;
          mapped.justify = n.justify;
          mapped.padding = n.padding || 0;
        }
        if (n.children) {
          mapped.children = n.children.map(mapNode);
        }
        return mapped;
      };
      
      for (const n of f.children || []) {
        frame.children.push(mapNode(n));
      }
      page.frames.push(frame);
    }
    out.pages.push(page as any);
  }
  return out;
}

// ---- Tiny layout engine for placement rules ----
function layoutDoc(doc: ViewerDoc): ViewerDoc {
  const next: ViewerDoc = JSON.parse(JSON.stringify(doc));

  const resolvePlace = (node: ViewerNode, siblings: ViewerNode[], parentW: number, parentH: number, parentX: number = 0, parentY: number = 0) => {
    const idx = Object.fromEntries(siblings.map(n => [n.id, n]));
    if (!node.place) return;
    for (const r of node.place) {
      if (r.type === "centered") {
        const ref = r.ref ? idx[r.ref] : undefined;
        const bx = ref ? (ref.x || 0) : parentX, by = ref ? (ref.y || 0) : parentY;
        const bw = ref ? (Number(ref.w) || parentW) : parentW, bh = ref ? (Number(ref.h) || parentH) : parentH;
        node.x = bx + (bw - (Number(node.w) || 0)) / 2; node.y = by + (bh - (Number(node.h) || 0)) / 2; continue;
      }
      if (r.type === "centerX") { const ref = r.ref ? idx[r.ref] : undefined; const bx = ref ? (ref.x || 0) : parentX; const bw = ref ? (Number(ref.w) || parentW) : parentW; node.x = bx + (bw - (Number(node.w) || 0)) / 2; continue; }
      if (r.type === "centerY") { const ref = r.ref ? idx[r.ref] : undefined; const by = ref ? (ref.y || 0) : parentY; const bh = ref ? (Number(ref.h) || parentH) : parentH; node.y = by + (bh - (Number(node.h) || 0)) / 2; continue; }
      if (r.type === "below")  { const ref = idx[r.ref]; if (ref) node.y = (ref.y || 0) + (Number(ref.h) || 0) + (r.by || 0); continue; }
      if (r.type === "above")  { const ref = idx[r.ref]; if (ref) node.y = (ref.y || 0) - (Number(node.h) || 0) - (r.by || 0); continue; }
      if (r.type === "rightOf"){ const ref = idx[r.ref]; if (ref) node.x = (ref.x || 0) + (Number(ref.w) || 0) + (r.by || 0); continue; }
      if (r.type === "leftOf") { const ref = idx[r.ref]; if (ref) node.x = (ref.x || 0) - (Number(node.w) || 0) - (r.by || 0); continue; }
      if (r.type === "inside") {
        const ref = idx[r.ref];
        const inset = r.inset;
        const t = Array.isArray(inset) ? inset : inset !== undefined ? [inset, inset, inset, inset] : [0,0,0,0];
        const bx = ref ? (ref.x || 0) : parentX, by = ref ? (ref.y || 0) : parentY;
        const bw = ref ? (Number(ref.w) || parentW) : parentW, bh = ref ? (Number(ref.h) || parentH) : parentH;
        node.x = Math.max(bx + t[3], Math.min((node.x ?? bx + t[3]), bx + bw - (Number(node.w) || 0) - t[1]));
        node.y = Math.max(by + t[0], Math.min((node.y ?? by + t[0]), by + bh - (Number(node.h) || 0) - t[2]));
        continue;
      }
      if (r.type === "alignLeft")   { const ref = idx[r.ref]; if (ref) node.x = (ref.x || 0); continue; }
      if (r.type === "alignRight")  { const ref = idx[r.ref]; if (ref) node.x = (ref.x || 0) + (Number(ref.w) || 0) - (Number(node.w) || 0); continue; }
      if (r.type === "alignTop")    { const ref = idx[r.ref]; if (ref) node.y = (ref.y || 0); continue; }
      if (r.type === "alignBottom") { const ref = idx[r.ref]; if (ref) node.y = (ref.y || 0) + (Number(ref.h) || 0) - (Number(node.h) || 0); continue; }
    }
  };

  const layoutNode = (node: ViewerNode, siblings: ViewerNode[], parentX: number, parentY: number, parentW: number, parentH: number) => {
    // 1. Initial Sizing
    if (node.kind === "text") {
      const size = node.style?.text?.size ?? 14;
      node.w = node.w ?? Math.max(80, (node.text?.length || 1) * (size * 0.6) + 16);
      node.h = node.h ?? (size * 1.6);
    } else if (node.kind === "image") {
      node.w = node.w ?? 64; node.h = node.h ?? 64;
    } else if (node.kind === "rect" || node.kind === "flex") {
      if (node.w === "fill") node.w = parentW;
      if (node.h === "fill") node.h = parentH;
      node.w = node.w ?? (node.kind === "flex" ? parentW : 100); 
      node.h = node.h ?? (node.kind === "flex" ? "hug" : 40);
    }

    // 2. Resolve absolute placement rules if any
    resolvePlace(node, siblings, parentW, parentH, parentX, parentY);

    if (node.x === undefined) node.x = parentX + 16;
    if (node.y === undefined) node.y = parentY + 16;

    // 3. Layout Children
    if (node.children) {
      if (node.kind === "flex") {
        const isCol = node.direction !== "row";
        const gap = node.gap || 0;
        const pad = node.padding || 0;
        let cx = node.x + pad;
        let cy = node.y + pad;
        let maxChildW = 0;
        let maxChildH = 0;

        for (const child of node.children) {
          // Pre-assign coordinates so absolute children have an anchor
          if (!child.place || child.place.length === 0) {
             child.x = cx;
             child.y = cy;
          }

          layoutNode(child, node.children, child.x ?? cx, child.y ?? cy, Number(node.w) - pad * 2, Number(node.h) === Number.NaN ? parentH : Number(node.h));
          
          // Simple stacking logic (main axis)
          if (!child.place || child.place.length === 0) {
             if (isCol) {
               cy += (Number(child.h) || 0) + gap;
             } else {
               cx += (Number(child.w) || 0) + gap;
             }
          }
          maxChildW = Math.max(maxChildW, (child.x - node.x) + (Number(child.w) || 0));
          maxChildH = Math.max(maxChildH, (child.y - node.y) + (Number(child.h) || 0));
        }

        // Hug content sizing
        if (node.w === "hug" || node.w === undefined) node.w = maxChildW + pad;
        if (node.h === "hug" || node.h === undefined) node.h = maxChildH + pad;
      } else {
        // Layout absolute children for non-flex nodes
        for (const child of node.children) {
          layoutNode(child, node.children, node.x, node.y, Number(node.w), Number(node.h));
        }
      }
    }
  };

  for (const page of next.pages) {
    for (const frame of page.frames) {
      for (const node of frame.children) {
        layoutNode(node, frame.children, 0, 0, frame.w, frame.h);
      }
    }
  }
  return next;
}

function slug(s: string){ return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") }
