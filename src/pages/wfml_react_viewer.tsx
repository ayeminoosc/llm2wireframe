// src/components/WFMLReactViewerInline.tsx
import React, { useEffect, useMemo, useState } from "react";

// ⬇️ Adjust this to your parser location
import { parseWFML } from "../parser/wfml-grammar-parser-emitter";

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
  kind: "rect" | "text" | "image";
  id: string;
  x?: number; y?: number; w?: number; h?: number;
  text?: string; src?: string;
  style?: {
    fill?: string; stroke?: string; strokeWidth?: number; corner?: number;
    text?: { size?: number; weight?: number; align?: "left" | "center" | "right" }
  };
  place?: PlacementRule[];
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

    image logo:
      src: https://dummyimage.com/64x64/2b59ff/ffffff.png&text=U
      w: 64
      h: 64
      place: centered in #iPhone13, above #title by 60

    text title:
      text: "Welcome back"
      style:
        text:
          size: 24
          weight: 700
      place: below #logo by 12, centerX

    rect email:
      w: 300
      h: 44
      style:
        fill: #ffffff
        stroke: #999
        corner: 10
      place: below #title by 24, centerX

    rect password:
      w: 300
      h: 44
      style:
        fill: #ffffff
        stroke: #999
        corner: 10
      place: below #email by 12, alignLeft #email

    rect loginbtn:
      w: 300
      h: 44
      style:
        fill: #2B59FF
        corner: 10
      place: below #password by 16, centerX

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

  const styles: Record<string, React.CSSProperties> = {
    wrap: {
      width: "100%", height, display: "grid",
      gridTemplateColumns: "1fr 1fr", gap: 16, padding: 16,
      boxSizing: "border-box", background: "#f5f6fa"
    },
    col: { display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    button: { padding: "6px 10px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" },
    textarea: {
      flex: 1, minHeight: 240,
      fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 12,
      padding: 10, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff"
    },
    preview: {
      position: "relative", background: "#fff",
      border: "1px solid #e5e7eb", borderRadius: 12, padding: 12,
      overflow: "auto", minWidth: 0, minHeight: 0
    },
    pageTitle: { fontSize: 13, color: "#475569", marginBottom: 8, fontWeight: 600 },
    frameWrap: { display: "inline-block", background: "#f1f5f9", border: "1px dashed #e5e7eb", borderRadius: 12, padding: 12 },
    svg: { background: "#fff", borderRadius: 8, boxShadow: "inset 0 0 0 1px #e5e7eb" },
    error: { marginTop: 8, fontSize: 12, color: "#b91c1c", whiteSpace: "pre-wrap", fontFamily: "ui-monospace, Menlo, Consolas, monospace" },
    title: { margin: 0, fontSize: 18, fontWeight: 700 },
  };

  return (
    <div style={styles.wrap}>
      {/* LEFT: editor */}
      <div style={styles.col}>
        <div style={styles.header}>
          <h2 style={styles.title}>WFML (left) → SVG (right)</h2>
          <button type="button" style={styles.button} onClick={rebuild}>Re-render</button>
        </div>
        <textarea style={styles.textarea} value={src} onChange={(e) => setSrc(e.target.value)} spellCheck={false} />
        {parseErrors.length ? <div style={styles.error}>{parseErrors.map((e: any) => `L${e.line}: ${e.message}`).join("\n")}</div> : null}
      </div>

      {/* RIGHT: preview */}
      <div style={styles.preview}>
        {!view ? (
          <div style={{ color: "#64748b" }}>No parse result.</div>
        ) : (
          view.pages.map((p) => (
            <div key={p.id} style={{ marginBottom: 24 }}>
              <div style={styles.pageTitle}>Page: {p.name}</div>
              {p.frames.map((f) => (
                <div key={f.id} style={styles.frameWrap}>
                  <svg width={f.w} height={f.h} style={styles.svg}>
                    {f.style?.fill && <rect x={0} y={0} width={f.w} height={f.h} fill={f.style.fill} />}
                    {f.children.map((n) => {
                      const toNum = (v: any, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
                      const x = toNum(n.x, 0), y = toNum(n.y, 0), w = toNum(n.w, 100), h = toNum(n.h, 24);
                      const sw = n.style?.strokeWidth ?? 1;
                      const fill = n.style?.fill ?? (n.kind === "rect" ? "#fff" : "none");
                      const stroke = n.style?.stroke ?? "#1e293b22";
                      const corner = n.style?.corner ?? 8;

                      if (n.kind === "rect")
                        return <rect key={n.id} x={x} y={y} width={w} height={h} rx={corner} ry={corner} fill={fill} stroke={stroke} strokeWidth={sw} />;

                      if (n.kind === "image")
                        return <image key={n.id} x={x} y={y} width={w} height={h} href={n.src} preserveAspectRatio="xMidYMid meet" />;

                      // text
                      const txtSize = n.style?.text?.size ?? 14;
                      const weight = n.style?.text?.weight ?? 600;
                      const align = n.style?.text?.align ?? "center";
                      const padX = 8;
                      const txt = n.text || "";
                      const estW = Math.max(w, txt.length * (txtSize * 0.6) + padX * 2);
                      const anchor = align === "center" ? "middle" : align === "left" ? "start" : "end";
                      const tx = align === "center" ? x + estW / 2 : align === "left" ? x + padX : x + estW - padX;
                      const ty = y + h / 2 + txtSize * 0.35;
                      return <text key={n.id} x={tx} y={ty} textAnchor={anchor} fontSize={txtSize} fontWeight={weight} fill="#0f172a">{txt}</text>;
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
      for (const n of f.children || []) {
        if (!["rect", "text", "image"].includes(n.kind)) continue;
        frame.children.push({
          kind: n.kind, id: n.id, x: n.x, y: n.y, w: n.w, h: n.h,
          text: n.text, src: n.src,
          style: { fill: n.style?.fill, stroke: n.style?.stroke, strokeWidth: n.style?.strokeWidth, corner: n.style?.corner, text: n.style?.text },
          place: n.place as PlacementRule[] | undefined,
        });
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
  for (const page of next.pages) for (const frame of page.frames) {
    const idx: Record<string, ViewerNode> = {};
    for (const node of frame.children) {
      if (node.kind === "text") {
        const size = node.style?.text?.size ?? 14;
        node.w = node.w ?? Math.max(80, (node.text?.length || 1) * (size * 0.6) + 16);
        node.h = node.h ?? (size * 1.6);
      } else if (node.kind === "image") {
        node.w = node.w ?? 64; node.h = node.h ?? 64;
      } else if (node.kind === "rect") {
        node.w = node.w ?? 100; node.h = node.h ?? 40;
      }
      idx[node.id] = node;
    }
    for (const node of frame.children) {
      if (!node.place) continue;
      for (const r of node.place) {
        if (r.type === "centered") {
          const ref = r.ref ? idx[r.ref] : undefined;
          const bx = ref ? (ref.x || 0) : 0, by = ref ? (ref.y || 0) : 0;
          const bw = ref ? (ref.w || frame.w) : frame.w, bh = ref ? (ref.h || frame.h) : frame.h;
          node.x = bx + (bw - (node.w || 0)) / 2; node.y = by + (bh - (node.h || 0)) / 2; continue;
        }
        if (r.type === "centerX") { const ref = r.ref ? idx[r.ref] : undefined; const bx = ref ? (ref.x || 0) : 0; const bw = ref ? (ref.w || frame.w) : frame.w; node.x = bx + (bw - (node.w || 0)) / 2; continue; }
        if (r.type === "centerY") { const ref = r.ref ? idx[r.ref] : undefined; const by = ref ? (ref.y || 0) : 0; const bh = ref ? (ref.h || frame.h) : frame.h; node.y = by + (bh - (node.h || 0)) / 2; continue; }
        if (r.type === "below")  { const ref = idx[r.ref]; if (ref) node.y = (ref.y || 0) + (ref.h || 0) + (r.by || 0); continue; }
        if (r.type === "above")  { const ref = idx[r.ref]; if (ref) node.y = (ref.y || 0) - (node.h || 0) - (r.by || 0); continue; }
        if (r.type === "rightOf"){ const ref = idx[r.ref]; if (ref) node.x = (ref.x || 0) + (ref.w || 0) + (r.by || 0); continue; }
        if (r.type === "leftOf") { const ref = idx[r.ref]; if (ref) node.x = (ref.x || 0) - (node.w || 0) - (r.by || 0); continue; }
        if (r.type === "inside") {
          const ref = idx[r.ref];
          const inset = r.inset;
          const t = Array.isArray(inset) ? inset : inset !== undefined ? [inset, inset, inset, inset] : [0,0,0,0];
          const bx = ref ? (ref.x || 0) : 0, by = ref ? (ref.y || 0) : 0;
          const bw = ref ? (ref.w || frame.w) : frame.w, bh = ref ? (ref.h || frame.h) : frame.h;
          node.x = Math.max(bx + t[3], Math.min((node.x ?? bx + t[3]), bx + bw - (node.w || 0) - t[1]));
          node.y = Math.max(by + t[0], Math.min((node.y ?? by + t[0]), by + bh - (node.h || 0) - t[2]));
          continue;
        }
        if (r.type === "alignLeft")   { const ref = idx[r.ref]; if (ref) node.x = (ref.x || 0); continue; }
        if (r.type === "alignRight")  { const ref = idx[r.ref]; if (ref) node.x = (ref.x || 0) + (ref.w || 0) - (node.w || 0); continue; }
        if (r.type === "alignTop")    { const ref = idx[r.ref]; if (ref) node.y = (ref.y || 0); continue; }
        if (r.type === "alignBottom") { const ref = idx[r.ref]; if (ref) node.y = (ref.y || 0) + (ref.h || 0) - (node.h || 0); continue; }
      }
      if (node.x === undefined) node.x = 16;
      if (node.y === undefined) node.y = 16;
    }
  }
  return next;
}

function slug(s: string){ return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") }
