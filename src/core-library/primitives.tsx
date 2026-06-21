import type { NodeDefinition } from "../engine/registry";

const IMAGE_PLACEHOLDER = "https://dummyimage.com/100x100/2b59ff/ffffff.png&text=Img";

export const primitiveNodeDefinitions: NodeDefinition[] = [
  {
    kind: "frame",
    create: (id, x, y) => ({ kind: "frame", id, x, y, w: 390, h: 844 }),
    tool: { label: "Screen", icon: "📱" },
    properties: [
      { key: "w", label: "Width", type: "number" },
      { key: "h", label: "Height", type: "number" },
      { key: "style.fill", label: "Fill", type: "color" },
      { key: "semantic.role", label: "Semantic Role", type: "text" },
    ],
    render: ({ x, y, w, h, fill, stroke, strokeWidth, renderChildren }) => (
      <>
        <rect x={x} y={y} width={w} height={h} rx={12} ry={12} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        {renderChildren()}
      </>
    ),
  },
  {
    kind: "rect",
    create: (id, x, y) => ({ kind: "rect", id, x, y, w: 100, h: 100 }),
    tool: { label: "Rect", icon: "▱", separatorBefore: true },
    properties: [
      { key: "w", label: "Width", type: "number" },
      { key: "h", label: "Height", type: "number" },
      { key: "style.fill", label: "Fill", type: "color" },
      { key: "style.stroke", label: "Stroke", type: "color" },
      { key: "semantic.role", label: "Semantic Role", type: "text" },
    ],
    render: ({ x, y, w, h, fill, stroke, strokeWidth, corner, renderChildren }) => (
      <>
        <rect x={x} y={y} width={w} height={h} rx={corner} ry={corner} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        {renderChildren()}
      </>
    ),
  },
  {
    kind: "flex",
    create: (id, x, y) => ({ kind: "flex", id, x, y, w: 100, h: 100, style: { fill: "#f8fafc", stroke: "#cbd5e1" } }),
    tool: { label: "Flex", icon: "◫" },
    properties: [
      { key: "gap", label: "Gap", type: "number" },
      { key: "padding", label: "Padding", type: "number" },
      { key: "style.fill", label: "Fill", type: "color" },
      { key: "semantic.role", label: "Semantic Role", type: "text" },
    ],
    render: ({ x, y, w, h, fill, stroke, strokeWidth, corner, renderChildren }) => {
      const dash = stroke === "#cbd5e1" ? "4" : "none";
      return (
        <>
          {fill !== "none" && <rect x={x} y={y} width={w} height={h} rx={corner} ry={corner} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dash} />}
          {renderChildren()}
        </>
      );
    },
  },
  {
    kind: "ellipse",
    create: (id, x, y) => ({ kind: "ellipse", id, x, y, w: 100, h: 100 }),
    tool: { label: "Ellipse", icon: "◯" },
    properties: [
      { key: "w", label: "Width", type: "number" },
      { key: "h", label: "Height", type: "number" },
      { key: "style.fill", label: "Fill", type: "color" },
      { key: "semantic.role", label: "Semantic Role", type: "text" },
    ],
    render: ({ x, y, w, h, fill, stroke, strokeWidth, renderChildren }) => (
      <>
        <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        {renderChildren()}
      </>
    ),
  },
  {
    kind: "diamond",
    create: (id, x, y) => ({ kind: "diamond", id, x, y, w: 100, h: 100 }),
    tool: { label: "Diamond", icon: "◇" },
    properties: [
      { key: "w", label: "Width", type: "number" },
      { key: "h", label: "Height", type: "number" },
      { key: "style.fill", label: "Fill", type: "color" },
      { key: "semantic.role", label: "Semantic Role", type: "text" },
    ],
    render: ({ x, y, w, h, fill, stroke, strokeWidth, renderChildren }) => {
      const pts = `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`;
      return (
        <>
          <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
          {renderChildren()}
        </>
      );
    },
  },
  {
    kind: "sticky",
    create: (id, x, y) => ({ kind: "sticky", id, x, y, w: 120, h: 120, style: { fill: "#fef08a" } }),
    tool: { label: "Sticky", icon: "📝" },
    properties: [
      { key: "text", label: "Text", type: "text" },
      { key: "style.fill", label: "Fill", type: "color" },
      { key: "semantic.role", label: "Semantic Role", type: "text" },
    ],
    render: ({ node, x, y, w, h, stroke, strokeWidth, corner, renderChildren }) => {
      const rectFill = node.style?.fill ?? "#fef08a";
      return (
        <>
          <rect x={x} y={y} width={w} height={h} rx={2} ry={2} fill={rectFill} stroke={stroke} strokeWidth={strokeWidth} style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" }} />
          {renderChildren()}
        </>
      );
    },
  },
  {
    kind: "line",
    create: (id, x, y) => ({ kind: "line", id, x, y, w: 100, h: 2, style: { stroke: "#0f172a", strokeWidth: 2 } }),
    tool: { label: "Line", icon: "—" },
    properties: [
      { key: "w", label: "Length", type: "number" },
      { key: "style.stroke", label: "Stroke", type: "color" },
      { key: "semantic.role", label: "Semantic Role", type: "text" },
    ],
    render: ({ node, x, y, w, h, strokeWidth }) => (
      <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke={node.style?.stroke ?? "#0f172a"} strokeWidth={strokeWidth} />
    ),
  },
  {
    kind: "text",
    create: (id, x, y) => ({ kind: "text", id, x, y, text: "New Text" }),
    tool: { label: "Text", icon: "T" },
    properties: [
      { key: "text", label: "Text", type: "text" },
      { key: "style.text.size", label: "Size", type: "number" },
      { key: "semantic.role", label: "Semantic Role", type: "text" },
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
      return <text x={tx} y={ty} textAnchor={anchor} fontSize={txtSize} fontWeight={weight} fill="#0f172a">{txt}</text>;
    },
  },
  {
    kind: "image",
    create: (id, x, y) => ({ kind: "image", id, x, y, src: IMAGE_PLACEHOLDER, w: 100, h: 100 }),
    tool: { label: "Image", icon: "🖼" },
    properties: [
      { key: "src", label: "Source", type: "text" },
      { key: "w", label: "Width", type: "number" },
      { key: "h", label: "Height", type: "number" },
      { key: "semantic.role", label: "Semantic Role", type: "text" },
    ],
    render: ({ node, x, y, w, h }) => <image x={x} y={y} width={w} height={h} href={node.src} preserveAspectRatio="xMidYMid meet" />,
  },
];
