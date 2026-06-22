import type { NodeDefinition, NodePropertyDefinition } from "../engine/registry";

const IMAGE_PLACEHOLDER = "https://dummyimage.com/100x100/2b59ff/ffffff.png&text=Img";
const STROKE_COLORS = [
  { label: "Ink", value: "#1f2937", swatch: "#1f2937" },
  { label: "Red", value: "#ef4444", swatch: "#ef4444" },
  { label: "Green", value: "#34a853", swatch: "#34a853" },
  { label: "Blue", value: "#2f80ed", swatch: "#2f80ed" },
  { label: "Orange", value: "#f59e0b", swatch: "#f59e0b" },
  { label: "Gray", value: "#2d2d2d", swatch: "#2d2d2d" },
];
const FILL_COLORS = [
  { label: "None", value: "none", swatch: "checker" },
  { label: "Rose", value: "#fecaca", swatch: "#fecaca" },
  { label: "Green", value: "#bbf7d0", swatch: "#bbf7d0" },
  { label: "Blue", value: "#bfdbfe", swatch: "#bfdbfe" },
  { label: "Yellow", value: "#fde68a", swatch: "#fde68a" },
  { label: "Gray", value: "#e5e7eb", swatch: "#e5e7eb" },
];
const STROKE_WIDTH_OPTIONS = [
  { label: "Thin", value: "1", icon: "—" },
  { label: "Medium", value: "2", icon: "━" },
  { label: "Bold", value: "4", icon: "▁" },
];
const STROKE_STYLE_OPTIONS = [
  { label: "Solid", value: "solid", icon: "—" },
  { label: "Dashed", value: "dashed", icon: "- -" },
  { label: "Dotted", value: "dotted", icon: "...." },
];
const SLOPPINESS_OPTIONS = [
  { label: "Clean", value: "0", icon: "∿" },
  { label: "Loose", value: "1", icon: "≈" },
  { label: "Sketchy", value: "3", icon: "≋" },
];
const EDGES_OPTIONS = [
  { label: "Sharp", value: "sharp", icon: "□" },
  { label: "Round", value: "round", icon: "▢" },
];

const RECT_STYLE_PROPERTIES: NodePropertyDefinition[] = [
  { key: "style.stroke", label: "Stroke", type: "color", group: "Stroke", options: STROKE_COLORS },
  { key: "style.fill", label: "Background", type: "color", group: "Background", options: FILL_COLORS },
  { key: "style.strokeWidth", label: "Stroke width", type: "buttonGroup", group: "Stroke width", options: STROKE_WIDTH_OPTIONS },
  { key: "style.strokeStyle", label: "Stroke style", type: "buttonGroup", group: "Stroke style", options: STROKE_STYLE_OPTIONS },
  { key: "style.roughness", label: "Sloppiness", type: "buttonGroup", group: "Sloppiness", options: SLOPPINESS_OPTIONS },
  { key: "style.edges", label: "Edges", type: "buttonGroup", group: "Edges", options: EDGES_OPTIONS },
  { key: "opacity", label: "Opacity", type: "slider", group: "Opacity", min: 0, max: 100, step: 1 },
];

const SIZE_PROPERTIES: NodePropertyDefinition[] = [
  { key: "w", label: "Width", type: "number", group: "Size" },
  { key: "h", label: "Height", type: "number", group: "Size" },
];

const RECT_TEXT_PROPERTIES: NodePropertyDefinition[] = [
  { key: "text", label: "Text", type: "text", group: "Text content" },
  { key: "style.text.color", label: "Stroke", type: "color", group: "Text stroke", options: STROKE_COLORS },
  { key: "style.text.font", label: "Font family", type: "select", group: "Font family", options: [
    { label: "Inter", value: "Inter, sans-serif" },
    { label: "Arial", value: "Arial, sans-serif" },
    { label: "Georgia", value: "Georgia, serif" },
    { label: "Monospace", value: "Menlo, Consolas, monospace" },
  ] },
  { key: "style.text.size", label: "Font size", type: "number", group: "Font size" },
  { key: "style.text.align", label: "Text align", type: "buttonGroup", group: "Text align", options: [
    { label: "Left", value: "left", icon: "≡" },
    { label: "Center", value: "center", icon: "≣" },
    { label: "Right", value: "right", icon: "≢" },
  ] },
  { key: "style.text.opacity", label: "Opacity", type: "slider", group: "Text opacity", min: 0, max: 100, step: 1 },
];

const ROLE_PROPERTY: NodePropertyDefinition = { key: "semantic.role", label: "Role", type: "text", group: "Semantic" };

function renderNodeLabel(node: any, x: number, y: number, w: number, h: number) {
  if (!node.text) return null;
  const align = node.style?.text?.align ?? "center";
  const fontSize = Number(node.style?.text?.size ?? 18);
  const fontFamily = node.style?.text?.font ?? "Inter, sans-serif";
  const color = node.style?.text?.color ?? (node.style?.stroke ?? "#1f2937");
  const opacity = Math.max(0, Math.min(100, Number(node.style?.text?.opacity ?? 100))) / 100;
  const padX = 12;
  const textAnchor = align === "left" ? "start" : align === "right" ? "end" : "middle";
  const textX = align === "left" ? x + padX : align === "right" ? x + w - padX : x + w / 2;
  const textY = y + h / 2 + fontSize * 0.35;
  return <text x={textX} y={textY} textAnchor={textAnchor} fontSize={fontSize} fontFamily={fontFamily} fill={color} opacity={opacity} pointerEvents="none">{node.text}</text>;
}

function getStrokeDasharray(node: any) {
  const strokeStyle = node.style?.strokeStyle;
  if (strokeStyle === "dashed") return "10 6";
  if (strokeStyle === "dotted") return "2 6";
  if (Array.isArray(node.style?.dash)) return node.style.dash.join(" ");
  return undefined;
}

function getRoughFilter(node: any) {
  const roughness = Number(node.style?.roughness ?? 0);
  if (roughness >= 3) return "url(#rough-3)";
  if (roughness >= 2) return "url(#rough-2)";
  if (roughness >= 1) return "url(#rough-1)";
  return undefined;
}

function getCornerRadius(node: any, fallback = 8) {
  if (node.style?.edges === "sharp") return 0;
  if (node.style?.edges === "round") return Math.max(Number(node.style?.corner ?? fallback), 12);
  return Number(node.style?.corner ?? fallback);
}

export const primitiveNodeDefinitions: NodeDefinition[] = [
  {
    kind: "frame",
    create: (id, x, y) => ({ kind: "frame", id, x, y, w: 390, h: 844, opacity: 100, style: { fill: "#ffffff", stroke: "#1f2937", strokeWidth: 2, strokeStyle: "solid", roughness: 0, edges: "round" } }),
    tool: { label: "Screen", icon: "📱" },
    properties: [
      ...SIZE_PROPERTIES,
      ...RECT_STYLE_PROPERTIES,
      ROLE_PROPERTY,
    ],
    render: ({ node, x, y, w, h, fill, stroke, strokeWidth, renderChildren }) => {
      const opacity = Math.max(0, Math.min(100, Number(node.opacity ?? 100))) / 100;
      const corner = getCornerRadius(node, 12);
      return (
        <g opacity={opacity} filter={getRoughFilter(node)}>
          <rect x={x} y={y} width={w} height={h} rx={corner} ry={corner} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={getStrokeDasharray(node)} strokeLinejoin="round" strokeLinecap="round" />
          {renderChildren()}
        </g>
      );
    },
  },
  {
    kind: "rect",
    create: (id, x, y) => ({
      kind: "rect",
      id,
      x,
      y,
      w: 100,
      h: 100,
      text: "",
      opacity: 100,
      style: {
        fill: "none",
        stroke: "#1f2937",
        strokeWidth: 2,
        strokeStyle: "solid",
        roughness: 1,
        edges: "sharp",
        text: { color: "#1f2937", font: "Inter, sans-serif", size: 18, align: "center", opacity: 100 },
      },
    }),
    tool: { label: "Rect", icon: "▱", separatorBefore: true },
    properties: [
      ...SIZE_PROPERTIES,
      ...RECT_STYLE_PROPERTIES,
      ...RECT_TEXT_PROPERTIES,
      ROLE_PROPERTY,
    ],
    render: ({ node, x, y, w, h, fill, stroke, strokeWidth, renderChildren }) => {
      const corner = getCornerRadius(node);
      const opacity = Math.max(0, Math.min(100, Number(node.opacity ?? 100))) / 100;
      return (
        <g opacity={opacity} filter={getRoughFilter(node)}>
          <rect x={x} y={y} width={w} height={h} rx={corner} ry={corner} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={getStrokeDasharray(node)} strokeLinejoin="round" strokeLinecap="round" />
          {renderNodeLabel(node, x, y, w, h)}
          {renderChildren()}
        </g>
      );
    },
  },
  {
    kind: "flex",
    create: (id, x, y) => ({ kind: "flex", id, x, y, w: 100, h: 100, opacity: 100, style: { fill: "none", stroke: "#1f2937", strokeWidth: 2, strokeStyle: "dashed", roughness: 0, edges: "round" } }),
    tool: { label: "Flex", icon: "◫" },
    properties: [
      { key: "gap", label: "Gap", type: "number" },
      { key: "padding", label: "Padding", type: "number" },
      { key: "direction", label: "Direction", type: "buttonGroup", group: "Layout", options: [{ label: "Column", value: "column", icon: "↕" }, { label: "Row", value: "row", icon: "↔" }] },
      ...SIZE_PROPERTIES,
      ...RECT_STYLE_PROPERTIES,
      ROLE_PROPERTY,
    ],
    render: ({ node, x, y, w, h, fill, stroke, strokeWidth, renderChildren }) => {
      const opacity = Math.max(0, Math.min(100, Number(node.opacity ?? 100))) / 100;
      const corner = getCornerRadius(node);
      return (
        <g opacity={opacity} filter={getRoughFilter(node)}>
          <rect x={x} y={y} width={w} height={h} rx={corner} ry={corner} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={getStrokeDasharray(node)} strokeLinejoin="round" strokeLinecap="round" />
          {renderChildren()}
        </g>
      );
    },
  },
  {
    kind: "ellipse",
    create: (id, x, y) => ({ kind: "ellipse", id, x, y, w: 100, h: 100, opacity: 100, style: { fill: "none", stroke: "#1f2937", strokeWidth: 2, strokeStyle: "solid", roughness: 1 } }),
    tool: { label: "Ellipse", icon: "◯" },
    properties: [
      ...SIZE_PROPERTIES,
      { key: "style.stroke", label: "Stroke", type: "color", group: "Stroke", options: STROKE_COLORS },
      { key: "style.fill", label: "Background", type: "color", group: "Background", options: FILL_COLORS },
      { key: "style.strokeWidth", label: "Stroke width", type: "buttonGroup", group: "Stroke width", options: STROKE_WIDTH_OPTIONS },
      { key: "style.strokeStyle", label: "Stroke style", type: "buttonGroup", group: "Stroke style", options: STROKE_STYLE_OPTIONS },
      { key: "style.roughness", label: "Sloppiness", type: "buttonGroup", group: "Sloppiness", options: SLOPPINESS_OPTIONS },
      { key: "opacity", label: "Opacity", type: "slider", group: "Opacity", min: 0, max: 100, step: 1 },
      ROLE_PROPERTY,
    ],
    render: ({ node, x, y, w, h, fill, stroke, strokeWidth, renderChildren }) => {
      const opacity = Math.max(0, Math.min(100, Number(node.opacity ?? 100))) / 100;
      return (
        <g opacity={opacity} filter={getRoughFilter(node)}>
          <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={getStrokeDasharray(node)} />
          {renderChildren()}
        </g>
      );
    },
  },
  {
    kind: "diamond",
    create: (id, x, y) => ({ kind: "diamond", id, x, y, w: 100, h: 100, opacity: 100, style: { fill: "none", stroke: "#1f2937", strokeWidth: 2, strokeStyle: "solid", roughness: 1 } }),
    tool: { label: "Diamond", icon: "◇" },
    properties: [
      ...SIZE_PROPERTIES,
      { key: "style.stroke", label: "Stroke", type: "color", group: "Stroke", options: STROKE_COLORS },
      { key: "style.fill", label: "Background", type: "color", group: "Background", options: FILL_COLORS },
      { key: "style.strokeWidth", label: "Stroke width", type: "buttonGroup", group: "Stroke width", options: STROKE_WIDTH_OPTIONS },
      { key: "style.strokeStyle", label: "Stroke style", type: "buttonGroup", group: "Stroke style", options: STROKE_STYLE_OPTIONS },
      { key: "style.roughness", label: "Sloppiness", type: "buttonGroup", group: "Sloppiness", options: SLOPPINESS_OPTIONS },
      { key: "opacity", label: "Opacity", type: "slider", group: "Opacity", min: 0, max: 100, step: 1 },
      ROLE_PROPERTY,
    ],
    render: ({ node, x, y, w, h, fill, stroke, strokeWidth, renderChildren }) => {
      const pts = `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`;
      return (
        <g opacity={Math.max(0, Math.min(100, Number(node.opacity ?? 100))) / 100} filter={getRoughFilter(node)}>
          <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={getStrokeDasharray(node)} strokeLinejoin="round" strokeLinecap="round" />
          {renderChildren()}
        </g>
      );
    },
  },
  {
    kind: "sticky",
    create: (id, x, y) => ({ kind: "sticky", id, x, y, w: 120, h: 120, style: { fill: "#fef08a" } }),
    tool: { label: "Sticky", icon: "📝" },
    properties: [
      { key: "text", label: "Text", type: "text" },
      { key: "style.stroke", label: "Stroke", type: "color", group: "Stroke", options: STROKE_COLORS },
      { key: "style.fill", label: "Background", type: "color", group: "Background", options: FILL_COLORS.filter((option) => option.value !== "none") },
      { key: "style.strokeWidth", label: "Stroke width", type: "buttonGroup", group: "Stroke width", options: STROKE_WIDTH_OPTIONS },
      { key: "style.strokeStyle", label: "Stroke style", type: "buttonGroup", group: "Stroke style", options: STROKE_STYLE_OPTIONS },
      { key: "opacity", label: "Opacity", type: "slider", group: "Opacity", min: 0, max: 100, step: 1 },
      ROLE_PROPERTY,
    ],
    render: ({ node, x, y, w, h, stroke, strokeWidth, corner, renderChildren }) => {
      const rectFill = node.style?.fill ?? "#fef08a";
      return (
        <g opacity={Math.max(0, Math.min(100, Number(node.opacity ?? 100))) / 100}>
          <rect x={x} y={y} width={w} height={h} rx={2} ry={2} fill={rectFill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={getStrokeDasharray(node)} style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" }} />
          {renderChildren()}
        </g>
      );
    },
  },
  {
    kind: "line",
    create: (id, x, y) => ({ kind: "line", id, x, y, w: 100, h: 2, opacity: 100, style: { stroke: "#1f2937", strokeWidth: 2, strokeStyle: "solid", roughness: 1 } }),
    tool: { label: "Line", icon: "—" },
    properties: [
      { key: "w", label: "Length", type: "number" },
      { key: "style.stroke", label: "Stroke", type: "color", group: "Stroke", options: STROKE_COLORS },
      { key: "style.strokeWidth", label: "Stroke width", type: "buttonGroup", group: "Stroke width", options: STROKE_WIDTH_OPTIONS },
      { key: "style.strokeStyle", label: "Stroke style", type: "buttonGroup", group: "Stroke style", options: STROKE_STYLE_OPTIONS },
      { key: "style.roughness", label: "Sloppiness", type: "buttonGroup", group: "Sloppiness", options: SLOPPINESS_OPTIONS },
      { key: "opacity", label: "Opacity", type: "slider", group: "Opacity", min: 0, max: 100, step: 1 },
      ROLE_PROPERTY,
    ],
    render: ({ node, x, y, w, h, strokeWidth }) => (
      <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke={node.style?.stroke ?? "#1f2937"} strokeWidth={strokeWidth} strokeDasharray={getStrokeDasharray(node)} opacity={Math.max(0, Math.min(100, Number(node.opacity ?? 100))) / 100} filter={getRoughFilter(node)} strokeLinecap="round" />
    ),
  },
  {
    kind: "text",
    create: (id, x, y) => ({ kind: "text", id, x, y, text: "New Text" }),
    tool: { label: "Text", icon: "T" },
    properties: [
      { key: "text", label: "Text", type: "text" },
      { key: "style.text.size", label: "Size", type: "number" },
      { key: "opacity", label: "Opacity", type: "slider", group: "Opacity", min: 0, max: 100, step: 1 },
      ROLE_PROPERTY,
    ],
    render: ({ node, x, y, w, h }) => {
      const txtSize = node.style?.text?.size ?? 14;
      const weight = node.style?.text?.weight ?? 600;
      const align = node.style?.text?.align ?? "center";
      const padX = 8;
      const txt = node.text || "";
      const estW = Math.max(w, txt.length * (txtSize * 0.6) + padX * 2);
      const anchor = align === "center" ? "middle" : align === "left" ? "start" : "end";
      const tx = align === "center" ? x + estW / 2 : align === "left" ? x + padX : x + estW - padX;
      const ty = y + h / 2 + txtSize * 0.35;
      return <text x={tx} y={ty} textAnchor={anchor} fontSize={txtSize} fontWeight={weight} fill="#0f172a" opacity={Math.max(0, Math.min(100, Number(node.opacity ?? 100))) / 100}>{txt}</text>;
    },
  },
  {
    kind: "image",
    create: (id, x, y) => ({ kind: "image", id, x, y, src: IMAGE_PLACEHOLDER, w: 100, h: 100, opacity: 100 }),
    tool: { label: "Image", icon: "🖼" },
    properties: [
      { key: "src", label: "Source", type: "text" },
      ...SIZE_PROPERTIES,
      { key: "opacity", label: "Opacity", type: "slider", group: "Opacity", min: 0, max: 100, step: 1 },
      ROLE_PROPERTY,
    ],
    render: ({ node, x, y, w, h }) => <image x={x} y={y} width={w} height={h} href={node.src} preserveAspectRatio="xMidYMid meet" opacity={Math.max(0, Math.min(100, Number(node.opacity ?? 100))) / 100} />,
  },
];
