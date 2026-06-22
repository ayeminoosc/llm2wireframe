/*
  WFML Grammar + Parser/Emitter (TypeScript, no external deps)
  -----------------------------------------------------------
  ✅ LLM-friendly, indentation-based DSL → AST (WFJSON)
  ✅ Emitter back to WFML (canonical formatting)
  ✅ Comments preserved at node level (attached to meta.comments)
  ✅ Placement parser robust to commas inside parentheses (e.g., inset(8,16,8,16))
  ✅ Robust block parsing across blank lines/comments
  ✅ Arrow/Line typing via ConnectorBase (no TS2430)
  ✅ style: blocks merge into node.style
*/

import type {
  AnchorRef,
  ArrowHead,
  Asset,
  Component,
  Frame,
  Group,
  Instance,
  Node,
  NodeTrivia,
  PlacementRule,
  PropSpec,
  Style,
  WFDocument,
} from "../wfml-core/ast";

export type {
  AnchorRef,
  ArrowHead,
  Asset,
  Component,
  Frame,
  Group,
  Instance,
  Node,
  NodeTrivia,
  PlacementRule,
  PropSpec,
  Style,
  WFDocument,
} from "../wfml-core/ast";

// -----------------------------
// Errors & result
// -----------------------------
export interface ParseError { line: number; column: number; message: string }
export interface ParseWarning { line: number; message: string }
export interface ParseResult { doc: WFDocument; errors: ParseError[]; warnings: ParseWarning[] }

// -----------------------------
// Lexer (indentation-aware)
// -----------------------------
interface LineToken {
  lineNo: number; indent: number; raw: string; text: string; isComment: boolean; isBlank: boolean;
}

function lexLines(src: string): LineToken[] {
  const out: LineToken[] = [];
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const m = raw.match(/^(\s*)(.*)$/)!;
    const leading = m[1] ?? "";
    const text = (m[2] ?? "").trimEnd();
    const isBlank = text.trim().length === 0;
    const isComment = /^\s*(#|\/\/)/.test(raw);
    const indent = Math.floor(leading.replace(/\t/g, "  ").length / 2);
    out.push({ lineNo: i + 1, indent, raw, text, isComment, isBlank });
  }
  return out;
}

// -----------------------------
// Parser (recursive descent over lines)
// -----------------------------
export function parseWFML(src: string): ParseResult {
  const lines = lexLines(src);
  const C: ParseContext = { i: 0, lines, errors: [], warnings: [], pendingComments: [] };

  const doc: WFDocument = { type: "wfdoc", meta: {}, assets: [], components: [], children: [] };

  // Consume file-level comments
  while (peek(C) && (peek(C)!.isComment || peek(C)!.isBlank)) {
    if (peek(C)!.isComment) C.pendingComments.push(stripComment(peek(C)!.raw));
    C.i++;
  }
  if (C.pendingComments.length) doc.meta.comments = takeComments(C);

  // Top-level
  while (peek(C)) {
    const tok = peek(C)!;
    if (tok.isBlank) { C.i++; continue; }
    if (tok.isComment) { C.pendingComments.push(stripComment(tok.raw)); C.i++; continue; }

    if (isHeader(tok, 0, "meta")) {
      C.i++; // consume 'meta:'
      attachComments(doc.meta, C);
      parseKeyValuesInto(C, 1, doc.meta);
      continue;
    }

    if (isHeader(tok, 0, "assets")) {
      C.i++; // consume 'assets:'
      attachCommentsArray(doc.assets, C);
      parseAssets(C, 1, doc.assets);
      continue;
    }

    if (isHeader(tok, 0, "components")) {
      C.i++;
      parseComponents(C, 1, doc.components);
      continue;
    }

    // Try parsing as a root node
    const lenBefore = C.i;
    parseNodesLike(C, 0, doc.children);
    if (C.i === lenBefore) {
      C.errors.push({ line: tok.lineNo, column: 1, message: `Unexpected top-level line: "${tok.text}"` });
      C.i++;
    }
  }

  return { doc, errors: C.errors, warnings: C.warnings };
}

interface ParseContext {
  i: number; lines: LineToken[]; errors: ParseError[]; warnings: ParseWarning[]; pendingComments: string[];
}

function peek(C: ParseContext, offset = 0) { return C.lines[C.i + offset] }
function takeComments(C: ParseContext): string[] { const a = C.pendingComments; C.pendingComments = []; return a }
function attachComments(target: NodeTrivia, C: ParseContext) { const c = takeComments(C); if (c.length) target.comments = c }
function attachCommentsArray(arr: any[], C: ParseContext) { const c = takeComments(C); if (c.length) arr.push({ comments: c, __sectionComment: true }) }

function stripComment(raw: string) { return raw.replace(/^\s*(#|\/\/)\s?/, "").trimEnd() }

function isHeader(tok: LineToken, indent: number, keyword: string): boolean {
  return tok.indent === indent && new RegExp(`^${keyword}\\s*:\\s*$`).test(tok.text);
}
function matchHeader(tok: LineToken, indent: number, re: RegExp): RegExpMatchArray | null {
  return tok.indent === indent ? tok.text.match(re) : null;
}

function parseKeyValuesInto(C: ParseContext, indent: number, target: any) {
  while (peek(C)) {
    const tok = peek(C)!;
    if (!tok.isBlank && !tok.isComment && tok.indent < indent) break;
    if (tok.isBlank) { C.i++; continue; }
    if (tok.isComment) { C.pendingComments.push(stripComment(tok.raw)); C.i++; continue; }
    if (tok.indent > indent) { C.warnings.push({ line: tok.lineNo, message: "Extra indentation ignored" }); C.i++; continue; }
    if (!/:/.test(tok.text)) break;

    const kv = tok.text.match(/^(.*?)\s*:\s*(.*)$/)!;
    const key = kv[1].trim();
    const valRaw = kv[2];

    if (valRaw === "") {
      C.i++;
      const obj: any = {};
      attachComments(obj, C);
      parseKeyValuesInto(C, indent + 1, obj);
      setDeep(target, key, obj);
      continue;
    }

    const value = parseValue(valRaw.trim(), tok.lineNo, C);
    setDeep(target, key, value);
    C.i++;
  }
}

function parseAssets(C: ParseContext, indent: number, out: Asset[]) {
  while (peek(C)) {
    const tok = peek(C)!;
    if (!tok.isBlank && !tok.isComment && tok.indent < indent) break;
    if (tok.isBlank) { C.i++; continue; }
    if (tok.isComment) { C.pendingComments.push(stripComment(tok.raw)); C.i++; continue; }
    if (tok.indent !== indent) break;

    const li = tok.text.match(/^-(.*)$/);
    if (!li) { C.errors.push({ line: tok.lineNo, column: 1, message: "Expected '- ...' in assets" }); C.i++; continue; }

    const rest = li[1].trim();
    const asset: any = {};
    attachComments(asset, C);

    if (rest) {
      const kv = rest.match(/^(.*?)\s*:\s*(.*)$/);
      if (kv) {
        const key = kv[1].trim();
        const valRaw = kv[2].trim();
        setDeep(asset, key, parseValue(valRaw, tok.lineNo, C));
        C.i++;
        if (peek(C) && peek(C)!.indent === indent + 1) parseKeyValuesInto(C, indent + 1, asset);
      } else {
        C.i++;
        if (peek(C) && peek(C)!.indent === indent + 1) parseKeyValuesInto(C, indent + 1, asset);
      }
    } else {
      C.i++;
      if (peek(C) && peek(C)!.indent === indent + 1) parseKeyValuesInto(C, indent + 1, asset);
    }

    const normalized: Asset = {
      id: String(asset.id ?? asset.name ?? genId("asset")),
      kind: (asset.type ?? asset.kind ?? "image") as Asset["kind"],
      src: String(asset.src ?? ""),
      meta: asset.meta,
      comments: asset.comments
    };
    out.push(normalized);
  }
}

function parseComponents(C: ParseContext, indent: number, out: Component[]) {
  while (peek(C)) {
    const tok = peek(C)!;
    if (!tok.isBlank && !tok.isComment && tok.indent < indent) break;
    if (tok.isBlank) { C.i++; continue; }
    if (tok.isComment) { C.pendingComments.push(stripComment(tok.raw)); C.i++; continue; }
    if (tok.indent !== indent) break;

    const m = tok.text.match(/^component\s+([^:]+):\s*$/);
    if (!m) { C.errors.push({ line: tok.lineNo, column: 1, message: "Expected 'component Name:'" }); C.i++; continue; }

    C.i++;
    const comp: Component = { id: slugify(m[1]), name: m[1].trim(), nodes: [] };
    attachComments(comp, C);
    parseComponentBlock(C, indent + 1, comp);
    out.push(comp);
  }
}

function parseComponentBlock(C: ParseContext, indent: number, component: Component) {
  while (peek(C)) {
    const tok = peek(C)!;
    if (!tok.isBlank && !tok.isComment && tok.indent < indent) break;
    if (tok.isBlank) { C.i++; continue; }
    if (tok.isComment) { C.pendingComments.push(stripComment(tok.raw)); C.i++; continue; }
    if (tok.indent !== indent) break;

    if (isHeader(tok, indent, "semantic")) {
      C.i++;
      const semantic: any = {};
      parseKeyValuesInto(C, indent + 1, semantic);
      component.semantic = semantic;
      continue;
    }

    if (isHeader(tok, indent, "props")) {
      C.i++;
      const props: Record<string, PropSpec> = {};
      parsePropsInto(C, indent + 1, props);
      component.props = props;
      continue;
    }

    if (/^([\w-]+)\s+[^:]+:\s*$/.test(tok.text)) {
      parseNodesLike(C, indent, component.nodes);
      continue;
    }

    C.errors.push({ line: tok.lineNo, column: 1, message: `Unexpected component line: "${tok.text}"` });
    C.i++;
  }
}

function parsePropsInto(C: ParseContext, indent: number, out: Record<string, PropSpec>) {
  while (peek(C)) {
    const tok = peek(C)!;
    if (!tok.isBlank && !tok.isComment && tok.indent < indent) break;
    if (tok.isBlank) { C.i++; continue; }
    if (tok.isComment) { C.pendingComments.push(stripComment(tok.raw)); C.i++; continue; }
    if (tok.indent !== indent) break;

    const m = tok.text.match(/^([^:]+):\s*$/);
    if (!m) {
      C.errors.push({ line: tok.lineNo, column: 1, message: "Expected a prop header like 'title:'" });
      C.i++;
      continue;
    }

    C.i++;
    const spec: any = {};
    attachComments(spec, C);
    parseKeyValuesInto(C, indent + 1, spec);
    out[m[1].trim()] = spec;
  }
}

function parseNodesLike(C: ParseContext, indent: number, out: Node[]) {
  while (peek(C)) {
    const tok = peek(C)!;
    if (!tok.isBlank && !tok.isComment && tok.indent < indent) break;
    if (tok.isBlank) { C.i++; continue; }
    if (tok.isComment) { C.pendingComments.push(stripComment(tok.raw)); C.i++; continue; }
    if (tok.indent !== indent) break;

    const m = tok.text.match(/^([\w-]+)\s+([^:]+):\s*$/);
    if (!m) { C.errors.push({ line: tok.lineNo, column: 1, message: "Expected a node header like 'rect id:'" }); C.i++; continue; }

    const kind = m[1];
    const id = m[2].trim();
    C.i++;

    if (kind === "group") {
      const group: Group = { kind: "group", id: slugify(id), children: [] } as any;
      attachComments(group, C);
      parseNodeBlock(C, indent + 1, group, true);
      out.push(group);
    } else if (kind === "use") {
      const [compName, instId] = splitFirst(id, /\s+/);
      const inst: Instance = { kind: "instance", id: slugify(instId || compName), of: compName.trim() } as any;
      attachComments(inst, C);
      parseNodeBlock(C, indent + 1, inst, true);
      out.push(inst);
    } else {
      const node: any = { kind, id: slugify(id) };
      attachComments(node, C);
      parseNodeBlock(C, indent + 1, node, true);
      out.push(node as Node);
    }
  }
}

function parseNodeBlock(C: ParseContext, indent: number, node: any, canHaveChildren: boolean) {
  while (peek(C)) {
    const tok = peek(C)!;
    if (!tok.isBlank && !tok.isComment && tok.indent < indent) break;
    if (tok.isBlank) { C.i++; continue; }
    if (tok.isComment) { C.pendingComments.push(stripComment(tok.raw)); C.i++; continue; }
    if (tok.indent !== indent) break;

    if (canHaveChildren && /^([\w-]+)\s+[^:]+:\s*$/.test(tok.text)) {
      if (!node.children) node.children = [];
      parseNodesLike(C, indent, node.children);
      continue;
    }

    const kv = tok.text.match(/^(.*?)\s*:\s*(.*)$/);
    if (!kv) { C.errors.push({ line: tok.lineNo, column: 1, message: "Expected key: value" }); C.i++; continue; }

    const key = kv[1].trim();
    const valRaw = kv[2];

    if (valRaw === "") {
      C.i++;
      const obj: any = {};
      attachComments(obj, C);
      parseKeyValuesInto(C, indent + 1, obj);
      assignNodeKey(node, key, obj, tok.lineNo, C);
    } else {
      const value = parseValue(valRaw.trim(), tok.lineNo, C);
      C.i++;
      assignNodeKey(node, key, value, tok.lineNo, C);
    }
  }
}

function assignNodeKey(node: any, key: string, value: any, line: number, C: ParseContext) {
  const baseKeys = new Set(["id","name","z","lock","hidden","opacity","x","y","w","h","rotation","tags"]);
  const styleKeys = new Set(["fill","stroke","strokeWidth","dash","corner","shadow","sketch","roughness","seed"]);
  const textStyleKeys = new Set(["font","size","weight","align","wrap","autoSize"]);

  if (key === "place") { node.place = parsePlacement(String(value), line, C); return; }
  if (key === "style" && typeof value === "object") { node.style = { ...(node.style||{}), ...value }; return; }
  if (baseKeys.has(key)) { (node as any)[key] = value; return; }
  if (styleKeys.has(key)) { node.style = node.style || {}; (node.style as any)[key] = value; return; }

  if (node.kind === "text" && key === "text") { node.text = String(value); return; }
  if (node.kind === "sticky" && key === "text") { node.text = String(value); return; }
  if (node.kind === "image" && key === "src") { node.src = String(value); return; }
  if (node.kind === "image" && key === "fit") { node.fit = value; return; }
  if ((node.kind === "line" || node.kind === "arrow") && (key === "from" || key === "to")) { (node as any)[key] = parseAnchor(String(value)); return; }
  if ((node.kind === "arrow") && (key === "startHead" || key === "endHead" || key === "route")) { (node as any)[key] = value; return; }
  if ((node.kind === "polyline" || node.kind === "freehand") && key === "points") { (node as any)[key] = value; return; }
  if (key === "text" && textStyleKeys.has("size") === false) { node.text = value; return; }

  if (key.includes(".")) { setDeep(node, key, value); return; }

  node[key] = value;
}

// -----------------------------
// Small value parsers
// -----------------------------
function parseValue(raw: string, line: number, C: ParseContext): any {
  const t = raw.trim();
  if (t === "true") return true;
  if (t === "false") return false;
  if (t === "null") return null;
  if (/^[-+]?[0-9]*\.?[0-9]+$/.test(t)) return Number(t);
  if (/^#[0-9a-fA-F]{3,8}$/.test(t)) return t;
  if ((t.startsWith("\"") && t.endsWith("\"")) || (t.startsWith("'") && t.endsWith("'"))) return unquote(t);
  if (t.startsWith("[") || t.startsWith("{")) {
    try { return JSON.parse(jsonishToJson(t)); }
    catch (e) { C.errors.push({ line, column: 1, message: `Invalid JSON-ish value: ${t}` }); return t; }
  }
  return t;
}

function unquote(s: string) { return s.replace(/^['\"]|['\"]$/g, "").replace(/\\n/g, "\n").replace(/\\\"/g, '"') }
function jsonishToJson(s: string) { return s.replace(/(['\"])\s*:/g, '"$1":').replace(/'([^']*)'/g, '"$1"') }

function parseAnchor(s: string): AnchorRef {
  const m = s.trim().match(/^#([\w-]+)(?:\.(center|top|bottom|left|right|auto))?$/);
  if (m) return { ref: m[1], anchor: (m[2] as any) };
  return { ref: s.replace(/^#/, "") };
}

// Split by commas that are **not** inside parentheses
function splitPlaceParts(s: string): string[] {
  const parts: string[] = [];
  let cur = "";
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(') { depth++; cur += ch; continue; }
    if (ch === ')') { if (depth > 0) depth--; cur += ch; continue; }
    if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim().length) parts.push(cur.trim());
  return parts;
}

function parsePlacement(s: string, line: number, C: ParseContext): PlacementRule[] {
  const parts = splitPlaceParts(s);
  const rules: PlacementRule[] = [];
  for (const frag0 of parts) {
    const frag = frag0.trim();
    if (!frag) continue;
    let m: RegExpMatchArray | null;
    if ((m = frag.match(/^below\s+#([\w-]+)(?:\s+by\s+([\d.]+))?$/))) { rules.push({ type: "below", ref: m[1], by: m[2] ? Number(m[2]) : undefined }); continue; }
    if ((m = frag.match(/^above\s+#([\w-]+)(?:\s+by\s+([\d.]+))?$/))) { rules.push({ type: "above", ref: m[1], by: m[2] ? Number(m[2]) : undefined }); continue; }
    if ((m = frag.match(/^rightOf\s+#([\w-]+)(?:\s+by\s+([\d.]+))?$/))) { rules.push({ type: "rightOf", ref: m[1], by: m[2] ? Number(m[2]) : undefined }); continue; }
    if ((m = frag.match(/^leftOf\s+#([\w-]+)(?:\s+by\s+([\d.]+))?$/))) { rules.push({ type: "leftOf", ref: m[1], by: m[2] ? Number(m[2]) : undefined }); continue; }
    if ((m = frag.match(/^centerX(?:\s+of\s+#([\w-]+))?$/))) { rules.push({ type: "centerX", ref: m[1] }); continue; }
    if ((m = frag.match(/^centerY(?:\s+of\s+#([\w-]+))?$/))) { rules.push({ type: "centerY", ref: m[1] }); continue; }
    if ((m = frag.match(/^centered(?:\s+in\s+#([\w-]+))?$/))) { rules.push({ type: "centered", ref: m[1] }); continue; }
    if ((m = frag.match(/^alignLeft\s+#([\w-]+)$/))) { rules.push({ type: "alignLeft", ref: m[1] }); continue; }
    if ((m = frag.match(/^alignRight\s+#([\w-]+)$/))) { rules.push({ type: "alignRight", ref: m[1] }); continue; }
    if ((m = frag.match(/^alignTop\s+#([\w-]+)$/))) { rules.push({ type: "alignTop", ref: m[1] }); continue; }
    if ((m = frag.match(/^alignBottom\s+#([\w-]+)$/))) { rules.push({ type: "alignBottom", ref: m[1] }); continue; }
    if ((m = frag.match(/^inside\s+#([\w-]+)(?:\s+inset\(([^)]*)\))?$/))) {
      let inset: any = undefined;
      if (m[2]) {
        const nums = m[2].split(/\s*,\s*/).map(Number);
        inset = nums.length === 1 ? nums[0] : (nums as any);
      }
      rules.push({ type: "inside", ref: m[1], inset });
      continue;
    }
    C.warnings.push({ line, message: `Unknown placement fragment: '${frag}'` });
  }
  return rules;
}

function setDeep(obj: any, path: string, value: any) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (!(k in cur)) cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

function splitFirst(s: string, re: RegExp): [string, string] {
  const m = s.match(re);
  if (!m) return [s, ""];
  const idx = s.search(re);
  return [s.slice(0, idx), s.slice(idx + (m[0]?.length || 0))];
}

let _id = 0; function genId(prefix = "id"){ return `${prefix}-${++_id}` }
function slugify(s: string){ return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") }

// -----------------------------
// Emitter (AST → WFML text)
// -----------------------------
export interface EmitOptions { indent?: number }
export function emitWFML(doc: WFDocument, opts: EmitOptions = {}): string {
  const IND = " ".repeat(opts.indent ?? 2);
  const b: string[] = [];

  const pushComments = (cs?: string[], level = 0) => {
    if (!cs || !cs.length) return;
    for (const c of cs) b.push(IND.repeat(level) + `# ${c}`);
  };

  b.push(`meta:`);
  pushComments(doc.meta.comments, 1);
  emitObjectKV(b, doc.meta, 1, IND, new Set(["comments"]));
  b.push("");

  if (doc.assets?.length) {
    b.push(`assets:`);
    for (const a of doc.assets) {
      if ((a as any).__sectionComment) { pushComments(a.comments, 1); continue; }
      pushComments(a.comments, 1);
      b.push(IND + `- id: ${a.id}`);
      b.push(IND + IND + `type: ${a.kind}`);
      b.push(IND + IND + `src: ${quoteIfNeeded(a.src)}`);
      if (a.meta !== undefined) b.push(IND + IND + `meta: ${JSON.stringify(a.meta)}`);
    }
    b.push("");
  }

  if (doc.components?.length) {
    b.push(`components:`);
    for (const c of doc.components) {
      pushComments(c.comments, 1);
      b.push(IND + `component ${c.name}:`);
      if (c.semantic) emitObjectSection(b, "semantic", c.semantic as any, 2, IND);
      if (c.props && Object.keys(c.props).length) emitProps(b, c.props, 2, IND);
      for (const n of c.nodes) emitNode(b, n, 2, IND);
    }
    b.push("");
  }

  if (Array.isArray(doc.children)) {
    for (const n of doc.children) {
      emitNode(b, n, 0, IND);
    }
  }

  return b.join("\n").replace(/\n{3,}/g, "\n\n");
}

function emitNode(b: string[], n: Node | Group | Instance, level: number, IND: string) {
  pushIf(b, (n as any).comments, level);
  if ((n as any).kind === "group") {
    b.push(IND.repeat(level) + `group ${(n as any).name || (n as any).id}:`);
    emitNodeBody(b, n as any, level + 1, IND, true);
    return;
  }
  if ((n as any).kind === "instance") {
    const inst = n as Instance; b.push(IND.repeat(level) + `use ${inst.of} ${inst.name || inst.id}:`);
    emitNodeBody(b, n as any, level + 1, IND, false);
    return;
  }
  b.push(IND.repeat(level) + `${(n as any).kind} ${(n as any).name || (n as any).id}:`);
  emitNodeBody(b, n as any, level + 1, IND, true);
}

function emitNodeBody(b: string[], n: any, level: number, IND: string, includeChildren: boolean) {
  const kv: any = {};
  for (const k of ["x","y","w","h","rotation","opacity","z","lock","hidden","name"]) if (n[k] !== undefined) kv[k] = n[k];
  if (n.kind === "text" || n.kind === "sticky") kv.text = n.text;
  if (n.kind === "image") { kv.src = n.src; if (n.fit) kv.fit = n.fit }
  if (n.kind === "instance") { if (n.of) kv.of = n.of; if (n.overrides) kv.overrides = n.overrides }
  emitKV(b, kv, level, IND);
  emitStyle(b, n.style, level, IND);
  emitPlace(b, n.place, level, IND);
  if (n.semantic) emitObjectSection(b, "semantic", n.semantic, level, IND);
  if (n.extra) emitObjectKV(b, n.extra, level, IND);
  if (includeChildren && Array.isArray(n.children)) for (const c of n.children) emitNode(b, c, level, IND);
}

function emitObjectSection(b: string[], key: string, obj: Record<string, any>, level: number, IND: string) {
  b.push(IND.repeat(level) + `${key}:`);
  emitObjectKV(b, obj, level + 1, IND);
}

function emitProps(b: string[], props: Record<string, PropSpec>, level: number, IND: string) {
  b.push(IND.repeat(level) + `props:`);
  for (const [name, spec] of Object.entries(props)) {
    b.push(IND.repeat(level + 1) + `${name}:`);
    emitObjectKV(b, spec as Record<string, any>, level + 2, IND);
  }
}

function emitKV(b: string[], kv: Record<string, any>, level: number, IND: string) {
  for (const [k,v] of Object.entries(kv)) if (v !== undefined) {
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      b.push(IND.repeat(level) + `${k}:`); emitObjectKV(b, v, level + 1, IND);
    } else {
      b.push(IND.repeat(level) + `${k}: ${formatValue(v)}`);
    }
  }
}

function emitObjectKV(b: string[], obj: Record<string, any>, level: number, IND: string, skipKeys: Set<string> = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    if (skipKeys.has(k)) continue;
    if (v === undefined) continue;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      b.push(IND.repeat(level) + `${k}:`);
      emitObjectKV(b, v, level + 1, IND);
    } else {
      b.push(IND.repeat(level) + `${k}: ${formatValue(v)}`);
    }
  }
}

function emitStyle(b: string[], s: Style | undefined, level: number, IND: string) {
  if (!s) return;
  b.push(IND.repeat(level) + `style:`);
  const simple: any = { fill: s.fill, stroke: s.stroke, strokeWidth: s.strokeWidth, corner: s.corner, sketch: s.sketch, roughness: s.roughness, seed: s.seed };
  emitKV(b, simple, level + 1, IND);
  if (s.dash) b.push(IND.repeat(level + 1) + `dash: ${JSON.stringify(s.dash)}`);
  if (s.shadow) { b.push(IND.repeat(level + 1) + `shadow:`); emitObjectKV(b, s.shadow as any, level + 2, IND); }
  if (s.text) { b.push(IND.repeat(level + 1) + `text:`); emitObjectKV(b, s.text as any, level + 2, IND); }
}

function emitPlace(b: string[], rules: PlacementRule[] | undefined, level: number, IND: string) {
  if (!rules || !rules.length) return;
  const parts = rules.map(emitPlaceRule);
  b.push(IND.repeat(level) + `place: ${parts.join(", ")}`);
}
function emitPlaceRule(r: PlacementRule): string {
  switch (r.type) {
    case "below": return `below #${r.ref}${r.by!==undefined?` by ${r.by}`:``}`;
    case "above": return `above #${r.ref}${r.by!==undefined?` by ${r.by}`:``}`;
    case "rightOf": return `rightOf #${r.ref}${r.by!==undefined?` by ${r.by}`:``}`;
    case "leftOf": return `leftOf #${r.ref}${r.by!==undefined?` by ${r.by}`:``}`;
    case "centerX": return `centerX${r.ref?` of #${r.ref}`:``}`;
    case "centerY": return `centerY${r.ref?` of #${r.ref}`:``}`;
    case "centered": return `centered${r.ref?` in #${r.ref}`:``}`;
    case "alignLeft": return `alignLeft #${r.ref}`;
    case "alignRight": return `alignRight #${r.ref}`;
    case "alignTop": return `alignTop #${r.ref}`;
    case "alignBottom": return `alignBottom #${r.ref}`;
    case "inside": return `inside #${r.ref}${r.inset!==undefined?` inset(${Array.isArray(r.inset)?(r.inset as any).join(", "):r.inset})`:``}`;
  }
}

function pushIf(b: string[], comments: string[] | undefined, level: number) {
  if (!comments || !comments.length) return;
  for (const c of comments) b.push(" ".repeat(level*2) + `# ${c}`);
}

function quoteIfNeeded(s: string) { return /\s|:/.test(s) ? JSON.stringify(s) : s }
function formatValue(v: any): string {
  if (typeof v === "string") {
    if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
    if (/^[\w-.]+$/.test(v)) return v;
    return JSON.stringify(v);
  }
  if (typeof v === "number" || typeof v === "boolean" || v === null) return String(v);
  return JSON.stringify(v);
}
