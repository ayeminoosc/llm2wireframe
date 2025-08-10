import React, { useEffect, useMemo, useRef, useState } from "react";
import { parseWFML } from "../parser/wfml-grammar-parser-emitter";
// import { parseWFML } from "wfml-grammar-parser-emitter";

/**
 * WFMLReactViewer — drop-in React component that renders WFML using your real parser
 * ----------------------------------------------------------------------------------
 * ✅ Uses your TypeScript parser: adjust the import path below
 * ✅ Renders: frame background, rect, text, image
 * ✅ Supports placement: below, above, rightOf, leftOf, centerX/of, centerY/of, centered/in, inside/inset(...)
 * ✅ Simple drag-to-move (updates x/y in local state, not writing back to WFML)
 *
 * How to use:
 *   1) Make sure your parser/emitter is compiled or TS-ready.
 *   2) Adjust the import path for parseWFML (next line) to your file.
 *   3) <WFMLReactViewer initialText={yourWFMLString} />
 */
// ADJUST THIS IMPORT PATH TO YOUR PROJECT STRUCTURE
// e.g. "./wfml-grammar-parser-emitter"

// ————————————————————————————————————————————————————————————————————————————
// Types (light wrappers to avoid importing your AST types everywhere)
// ————————————————————————————————————————————————————————————————————————————

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

export type ViewerNode = {
  kind: "rect" | "text" | "image";
  id: string;
  x?: number; y?: number; w?: number; h?: number;
  text?: string;
  src?: string;
  style?: {
    fill?: string; stroke?: string; strokeWidth?: number; corner?: number;
    text?: { size?: number; weight?: number; align?: "left"|"center"|"right" }
  };
  place?: PlacementRule[];
};

export type ViewerFrame = { id: string; name?: string; w: number; h: number; style?: any; children: ViewerNode[] };
export type ViewerDoc = { pages: { id: string; name: string; frames: ViewerFrame[] }[] };

export interface WFMLReactViewerProps {
  initialText?: string;
  height?: number | string;
}

const SAMPLE = `meta:
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

export default function WFMLReactViewer({ initialText, height = 640 }: WFMLReactViewerProps) {
  const [src, setSrc] = useState(initialText ?? SAMPLE);
  const { doc, errors } = useMemo(() => parseWFML(src), [src]);
  const [view, setView] = useState<ViewerDoc | null>(null);

  useEffect(() => {
    if (!doc) return;
    const mapped = mapDoc(doc);
    setView(layoutDoc(mapped));
  }, [doc]);

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50" style={{ height }}>
      <div className="flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">WFML (left) → SVG (right)</h2>
          <button
            className="px-3 py-1.5 rounded-xl shadow text-sm bg-white hover:bg-slate-100 border"
            onClick={() => setView(v => (v ? layoutDoc(v) : v))}
          >Re-render</button>
        </div>
        <textarea
          className="flex-1 min-h-[240px] md:min-h-[400px] font-mono text-sm p-3 rounded-xl border bg-white shadow"
          value={src}
          onChange={(e) => setSrc(e.target.value)}
          spellCheck={false}
        />
        {errors?.length ? (
          <div className="mt-2 text-sm text-rose-700 whitespace-pre-wrap">
            {errors.map((e: any) => `L${e.line}: ${e.message}`).join("\n")}
          </div>
        ) : null}
      </div>

      <div className="relative bg-white rounded-xl shadow p-3 overflow-auto min-h-0">
        {!view ? (
          <div className="text-slate-500">No parse result.</div>
        ) : (
          view.pages.map((p) => (
            <div key={p.id} className="mb-8">
              <div className="text-sm font-medium text-slate-600 mb-2">Page: {p.name}</div>
              {p.frames.map((f) => (
                <FrameView key={f.id} frame={f} onUpdateNode={(id, patch) => {
                  setView((prev) => {
                    if (!prev) return prev;
                    const next: ViewerDoc = JSON.parse(JSON.stringify(prev));
                    const nf = next.pages[0].frames.find(fr => fr.id === f.id)!;
                    const nd = nf.children.find(n => n.id === id)!;
                    Object.assign(nd, patch);
                    return next;
                  });
                }} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FrameView({ frame, onUpdateNode }: { frame: ViewerFrame; onUpdateNode: (id: string, patch: Partial<ViewerNode>) => void }) {
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);

  const startDrag = (e: React.MouseEvent, n: ViewerNode) => {
    const x = n.x || 0, y = n.y || 0;
    setDrag({ id: n.id, dx: e.clientX - x, dy: e.clientY - y });
  };
  const onMove = (e: React.MouseEvent) => {
    if (!drag) return;
    onUpdateNode(drag.id, { x: e.clientX - drag.dx, y: e.clientY - drag.dy });
  };
  const endDrag = () => setDrag(null);

  return (
    <div className="inline-block border rounded-xl shadow-inner bg-slate-100 p-3">
      <svg width={frame.w} height={frame.h} onMouseMove={onMove} onMouseUp={endDrag} className="bg-white rounded-lg shadow">
        {/* Frame background */}
        {frame.style?.fill && (
          <rect x={0} y={0} width={frame.w} height={frame.h} fill={frame.style.fill} />
        )}

        {frame.children.map((n) => (
          <Shape key={n.id} n={n} onMouseDown={(e) => startDrag(e, n)} />
        ))}
      </svg>
    </div>
  );
}

function Shape({ n, onMouseDown }: { n: ViewerNode; onMouseDown: (e: React.MouseEvent) => void }) {
  const x = n.x || 0, y = n.y || 0, w = n.w || 100, h = n.h || 24;
  const sw = n.style?.strokeWidth ?? 1;
  const fill = n.style?.fill ?? (n.kind === 'rect' ? '#fff' : 'none');
  const stroke = n.style?.stroke ?? '#1e293b22';
  const corner = n.style?.corner ?? 8;

  if (n.kind === 'rect') {
    return (
      <g onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
        <rect x={x} y={y} width={w} height={h} rx={corner} ry={corner} fill={fill} stroke={stroke} strokeWidth={sw} />
      </g>
    );
  }
  if (n.kind === 'image') {
    return (
      <g onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
        <image x={x} y={y} width={w} height={h} href={n.src} preserveAspectRatio="xMidYMid meet" />
      </g>
    );
  }
  // text
  const textSize = n.style?.text?.size ?? 14;
  const weight = n.style?.text?.weight ?? 600;
  const align = n.style?.text?.align ?? 'center';
  const padX = 8;
  const txt = n.text || '';
  const estW = Math.max(w, (txt.length * (textSize * 0.6)) + padX * 2);
  const anchor = align === 'center' ? 'middle' : align === 'left' ? 'start' : 'end';
  const tx = align === 'center' ? x + estW / 2 : align === 'left' ? x + padX : x + estW - padX;
  const ty = y + h / 2 + textSize * 0.35;
  return (
    <g onMouseDown={onMouseDown} style={{ cursor: 'move' }}>
      <text x={tx} y={ty} textAnchor={anchor} fontSize={textSize} fontWeight={weight} fill="#0f172a">
        {txt}
      </text>
    </g>
  );
}

// ————————————————————————————————————————————————————————————————————————————
// Mapping from real AST → lightweight Viewer types
// ————————————————————————————————————————————————————————————————————————————
function mapDoc(resDoc: any): ViewerDoc {
  const out: ViewerDoc = { pages: [] };
  for (const p of resDoc.pages || []) {
    const page = { id: slug(p.name || p.id), name: p.name || p.id, frames: [] as ViewerFrame[] };
    for (const f of p.frames || []) {
      const frame: ViewerFrame = { id: f.id, name: f.name, w: f.w || 0, h: f.h || 0, style: f.style, children: [] };
      for (const n of f.children || []) {
        if (!['rect','text','image'].includes(n.kind)) continue; // render subset
        const vn: ViewerNode = {
          kind: n.kind,
          id: n.id,
          x: n.x, y: n.y, w: n.w, h: n.h,
          text: n.text, src: n.src,
          style: {
            fill: n.style?.fill, stroke: n.style?.stroke, strokeWidth: n.style?.strokeWidth, corner: n.style?.corner,
            text: n.style?.text
          },
          place: n.place as PlacementRule[] | undefined
        };
        frame.children.push(vn);
      }
      page.frames.push(frame);
    }
    out.pages.push(page as any);
  }
  return out;
}

// ————————————————————————————————————————————————————————————————————————————
// Layout (very small, rule-based; resolves place → x/y)
// ————————————————————————————————————————————————————————————————————————————
function layoutDoc(doc: ViewerDoc): ViewerDoc {
  const next: ViewerDoc = JSON.parse(JSON.stringify(doc));
  for (const page of next.pages) for (const frame of page.frames) {
    const idx: Record<string, ViewerNode> = {};
    // init sizes
    for (const node of frame.children) {
      if (node.kind === 'text') {
        const size = node.style?.text?.size ?? 14;
        node.w = node.w ?? Math.max(80, (node.text?.length || 1) * (size * 0.6) + 16);
        node.h = node.h ?? (size * 1.6);
      } else if (node.kind === 'image') {
        node.w = node.w ?? 64; node.h = node.h ?? 64;
      } else if (node.kind === 'rect') {
        node.w = node.w ?? 100; node.h = node.h ?? 40;
      }
      idx[node.id] = node;
    }

    for (const node of frame.children) {
      if (!node.place) continue;
      for (const r of node.place) {
        if (r.type === 'centered') {
          const ref = r.ref ? idx[r.ref] : undefined;
          const bx = ref ? (ref.x || 0) : 0; const by = ref ? (ref.y || 0) : 0;
          const bw = ref ? (ref.w || frame.w) : frame.w; const bh = ref ? (ref.h || frame.h) : frame.h;
          node.x = bx + (bw - (node.w || 0)) / 2; node.y = by + (bh - (node.h || 0)) / 2; continue;
        }
        if (r.type === 'centerX') {
          const ref = r.ref ? idx[r.ref] : undefined;
          const bx = ref ? (ref.x || 0) : 0; const bw = ref ? (ref.w || frame.w) : frame.w;
          node.x = bx + (bw - (node.w || 0)) / 2; continue;
        }
        if (r.type === 'centerY') {
          const ref = r.ref ? idx[r.ref] : undefined;
          const by = ref ? (ref.y || 0) : 0; const bh = ref ? (ref.h || frame.h) : frame.h;
          node.y = by + (bh - (node.h || 0)) / 2; continue;
        }
        if (r.type === 'below') { const ref = idx[r.ref]; if (ref) node.y = (ref.y || 0) + (ref.h || 0) + (r.by || 0); continue; }
        if (r.type === 'above') { const ref = idx[r.ref]; if (ref) node.y = (ref.y || 0) - (node.h || 0) - (r.by || 0); continue; }
        if (r.type === 'rightOf') { const ref = idx[r.ref]; if (ref) node.x = (ref.x || 0) + (ref.w || 0) + (r.by || 0); continue; }
        if (r.type === 'leftOf') { const ref = idx[r.ref]; if (ref) node.x = (ref.x || 0) - (node.w || 0) - (r.by || 0); continue; }
        if (r.type === 'inside') {
          const ref = idx[r.ref];
          const inset = r.inset;
          const t = Array.isArray(inset) ? inset : inset!==undefined ? [inset, inset, inset, inset] : [0,0,0,0];
          const bx = ref ? (ref.x || 0) : 0; const by = ref ? (ref.y || 0) : 0;
          const bw = ref ? (ref.w || frame.w) : frame.w; const bh = ref ? (ref.h || frame.h) : frame.h;
          node.x = Math.max(bx + t[3], Math.min((node.x ?? bx + t[3]), bx + bw - (node.w||0) - t[1]));
          node.y = Math.max(by + t[0], Math.min((node.y ?? by + t[0]), by + bh - (node.h||0) - t[2]));
          continue;
        }
        if (r.type === 'alignLeft') { const ref = idx[r.ref]; if (ref) node.x = (ref.x || 0); continue; }
        if (r.type === 'alignRight') { const ref = idx[r.ref]; if (ref) node.x = (ref.x || 0) + (ref.w || 0) - (node.w || 0); continue; }
        if (r.type === 'alignTop') { const ref = idx[r.ref]; if (ref) node.y = (ref.y || 0); continue; }
        if (r.type === 'alignBottom') { const ref = idx[r.ref]; if (ref) node.y = (ref.y || 0) + (ref.h || 0) - (node.h || 0); continue; }
      }
      if (node.x === undefined) node.x = 16;
      if (node.y === undefined) node.y = 16;
    }
  }
  return next;
}

function slug(s: string){ return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") }
