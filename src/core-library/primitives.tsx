import React from "react";
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

const ARROW_HEAD_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Arrow", value: "arrow" },
  { label: "Triangle", value: "triangle" },
  { label: "Circle", value: "circle" },
  { label: "Diamond", value: "diamond" },
  { label: "Bar", value: "bar" },
];

const ROUTE_OPTIONS = [
  { label: "Straight", value: "straight" },
  { label: "Orthogonal", value: "orthogonal" },
  { label: "Curve", value: "curve" },
];

const RECT_STYLE_PROPERTIES: NodePropertyDefinition[] = [
  { key: "style.stroke", label: "Stroke", type: "color", group: "Stroke", options: STROKE_COLORS },
  { key: "style.fill", label: "Background", type: "color", group: "Background", options: FILL_COLORS },
  { key: "style.strokeWidth", label: "Stroke width", type: "buttonGroup", group: "Stroke width", options: STROKE_WIDTH_OPTIONS },
  { key: "style.strokeStyle", label: "Stroke style", type: "buttonGroup", group: "Stroke style", options: STROKE_STYLE_OPTIONS },
  { key: "style.roughness", label: "Sloppiness", type: "buttonGroup", group: "Sloppiness", options: SLOPPINESS_OPTIONS },
  { key: "style.edges", label: "Edges", type: "buttonGroup", group: "Edges", options: EDGES_OPTIONS },
  { key: "opacity", label: "Opacity", type: "slider", group: "Opacity", min: 0, max: 100, step: 1 },
  { key: "rotation", label: "Rotation", type: "number", group: "Transform" },
];

const SHAPE_STYLE_PROPERTIES: NodePropertyDefinition[] = [
  { key: "style.stroke", label: "Stroke", type: "color", group: "Stroke", options: STROKE_COLORS },
  { key: "style.fill", label: "Background", type: "color", group: "Background", options: FILL_COLORS },
  { key: "style.strokeWidth", label: "Stroke width", type: "buttonGroup", group: "Stroke width", options: STROKE_WIDTH_OPTIONS },
  { key: "style.strokeStyle", label: "Stroke style", type: "buttonGroup", group: "Stroke style", options: STROKE_STYLE_OPTIONS },
  { key: "style.roughness", label: "Sloppiness", type: "buttonGroup", group: "Sloppiness", options: SLOPPINESS_OPTIONS },
  { key: "opacity", label: "Opacity", type: "slider", group: "Opacity", min: 0, max: 100, step: 1 },
  { key: "rotation", label: "Rotation", type: "number", group: "Transform" },
];

const SIZE_PROPERTIES: NodePropertyDefinition[] = [
  { key: "w", label: "Width", type: "number", group: "Size" },
  { key: "h", label: "Height", type: "number", group: "Size" },
];

const LINEAR_SIZE_PROPERTIES: NodePropertyDefinition[] = [
  { key: "w", label: "Span X", type: "number", group: "Size" },
  { key: "h", label: "Span Y", type: "number", group: "Size" },
];

const RECT_TEXT_PROPERTIES: NodePropertyDefinition[] = [
  { key: "text", label: "Text", type: "text", group: "Text content" },
  { key: "style.text.color", label: "Stroke", type: "color", group: "Text stroke", options: STROKE_COLORS },
  {
    key: "style.text.font",
    label: "Font family",
    type: "select",
    group: "Font family",
    options: [
      { label: "Inter", value: "Inter, sans-serif" },
      { label: "Arial", value: "Arial, sans-serif" },
      { label: "Georgia", value: "Georgia, serif" },
      { label: "Monospace", value: "Menlo, Consolas, monospace" },
    ],
  },
  { key: "style.text.size", label: "Font size", type: "number", group: "Font size" },
  {
    key: "style.text.align",
    label: "Text align",
    type: "buttonGroup",
    group: "Text align",
    options: [
      { label: "Left", value: "left", icon: "≡" },
      { label: "Center", value: "center", icon: "≣" },
      { label: "Right", value: "right", icon: "≢" },
    ],
  },
  { key: "style.text.opacity", label: "Opacity", type: "slider", group: "Text opacity", min: 0, max: 100, step: 1 },
];

const BOUND_TEXT_PROPERTIES: NodePropertyDefinition[] = [
  { key: "text", label: "Text", type: "text", group: "Text content" },
  ...RECT_TEXT_PROPERTIES.slice(1),
];

const LINE_PROPERTIES: NodePropertyDefinition[] = [
  ...LINEAR_SIZE_PROPERTIES,
  { key: "style.stroke", label: "Stroke", type: "color", group: "Stroke", options: STROKE_COLORS },
  { key: "style.strokeWidth", label: "Stroke width", type: "buttonGroup", group: "Stroke width", options: STROKE_WIDTH_OPTIONS },
  { key: "style.strokeStyle", label: "Stroke style", type: "buttonGroup", group: "Stroke style", options: STROKE_STYLE_OPTIONS },
  { key: "style.roughness", label: "Sloppiness", type: "buttonGroup", group: "Sloppiness", options: SLOPPINESS_OPTIONS },
  { key: "opacity", label: "Opacity", type: "slider", group: "Opacity", min: 0, max: 100, step: 1 },
];

const ARROW_PROPERTIES: NodePropertyDefinition[] = [
  ...LINE_PROPERTIES,
  { key: "startHead", label: "Start cap", type: "select", group: "Arrowheads", options: ARROW_HEAD_OPTIONS },
  { key: "endHead", label: "End cap", type: "select", group: "Arrowheads", options: ARROW_HEAD_OPTIONS },
  { key: "route", label: "Route", type: "select", group: "Route", options: ROUTE_OPTIONS },
];

const FREEHAND_PROPERTIES: NodePropertyDefinition[] = [
  { key: "style.stroke", label: "Stroke", type: "color", group: "Stroke", options: STROKE_COLORS },
  { key: "style.strokeWidth", label: "Stroke width", type: "buttonGroup", group: "Stroke width", options: STROKE_WIDTH_OPTIONS },
  { key: "style.strokeStyle", label: "Stroke style", type: "buttonGroup", group: "Stroke style", options: STROKE_STYLE_OPTIONS },
  { key: "style.roughness", label: "Sloppiness", type: "buttonGroup", group: "Sloppiness", options: SLOPPINESS_OPTIONS },
  { key: "opacity", label: "Opacity", type: "slider", group: "Opacity", min: 0, max: 100, step: 1 },
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

function clampOpacity(value: any) {
  return Math.max(0, Math.min(100, Number(value ?? 100))) / 100;
}

function getLinearPoints(node: any, x: number, y: number, w: number, h: number) {
  if (Array.isArray(node.points) && node.points.length >= 2) {
    return node.points.map((point: [number, number]) => [x + Number(point[0] ?? 0), y + Number(point[1] ?? 0)] as const);
  }
  return [[x, y], [x + w, y + h]] as const;
}

function getAnchorPoint(node: any, anchor?: string) {
  const x = Number(node?.x ?? 0);
  const y = Number(node?.y ?? 0);
  const w = Number(node?.w ?? 0);
  const h = Number(node?.h ?? 0);
  switch (anchor) {
    case "top": return [x + w / 2, y] as const;
    case "bottom": return [x + w / 2, y + h] as const;
    case "left": return [x, y + h / 2] as const;
    case "right": return [x + w, y + h / 2] as const;
    default: return [x + w / 2, y + h / 2] as const;
  }
}

function getRenderedLinearPoints(node: any, x: number, y: number, w: number, h: number, resolveNodeById: (id: string | null) => any) {
  const base = getLinearPoints(node, x, y, w, h);
  const points = base.map((point) => [...point] as [number, number]);
  if (node.from?.ref) {
    const fromNode = resolveNodeById(node.from.ref);
    if (fromNode) points[0] = [...getAnchorPoint(fromNode, node.from.anchor)];
  }
  if (node.to?.ref) {
    const toNode = resolveNodeById(node.to.ref);
    if (toNode) points[points.length - 1] = [...getAnchorPoint(toNode, node.to.anchor)];
  }
  return points;
}

function buildLinearPath(points: readonly (readonly [number, number])[], route: string | undefined) {
  if (!points.length) return "";
  const [start, ...rest] = points;
  if (!rest.length) return `M ${start[0]} ${start[1]}`;
  if (route === "curve" && points.length >= 2) {
    const end = points[points.length - 1];
    const midX = (start[0] + end[0]) / 2;
    const midY = (start[1] + end[1]) / 2;
    const bendY = Math.abs(end[0] - start[0]) > Math.abs(end[1] - start[1]) ? midY - 32 : midY;
    return `M ${start[0]} ${start[1]} Q ${midX} ${bendY} ${end[0]} ${end[1]}`;
  }
  if (route === "orthogonal" && points.length >= 2) {
    const end = points[points.length - 1];
    const midX = (start[0] + end[0]) / 2;
    return `M ${start[0]} ${start[1]} L ${midX} ${start[1]} L ${midX} ${end[1]} L ${end[0]} ${end[1]}`;
  }
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point[0]} ${point[1]}`).join(" ");
}

function getTerminalSegment(points: readonly (readonly [number, number])[], atStart: boolean) {
  if (points.length < 2) return null;
  if (atStart) {
    return { from: points[1], to: points[0] };
  }
  return { from: points[points.length - 2], to: points[points.length - 1] };
}

function renderArrowHead(kind: string | undefined, segment: { from: readonly [number, number]; to: readonly [number, number] } | null, stroke: string, strokeWidth: number) {
  if (!kind || kind === "none" || !segment) return null;
  const [fromX, fromY] = segment.from;
  const [toX, toY] = segment.to;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const size = Math.max(10, strokeWidth * 4.5);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = toX;
  const tipY = toY;
  const leftX = tipX - cos * size - sin * (size * 0.55);
  const leftY = tipY - sin * size + cos * (size * 0.55);
  const rightX = tipX - cos * size + sin * (size * 0.55);
  const rightY = tipY - sin * size - cos * (size * 0.55);
  const backX = tipX - cos * size;
  const backY = tipY - sin * size;

  if (kind === "arrow") return <path d={`M ${leftX} ${leftY} L ${tipX} ${tipY} L ${rightX} ${rightY}`} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />;
  if (kind === "triangle") return <polygon points={`${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`} fill={stroke} stroke={stroke} strokeWidth={Math.max(1, strokeWidth * 0.8)} strokeLinejoin="round" />;
  if (kind === "diamond") return <polygon points={`${tipX},${tipY} ${leftX},${leftY} ${backX},${backY} ${rightX},${rightY}`} fill="white" stroke={stroke} strokeWidth={Math.max(1, strokeWidth * 0.8)} strokeLinejoin="round" />;
  if (kind === "circle") return <circle cx={tipX - cos * (size * 0.55)} cy={tipY - sin * (size * 0.55)} r={size * 0.35} fill="white" stroke={stroke} strokeWidth={Math.max(1, strokeWidth * 0.8)} />;
  if (kind === "bar") return <line x1={leftX} y1={leftY} x2={rightX} y2={rightY} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />;
  return null;
}

export const primitiveNodeDefinitions: NodeDefinition[] = [
  {
    kind: "frame",
    create: (id, x, y) => ({ kind: "frame", id, x, y, w: 390, h: 844, opacity: 100, style: { fill: "#ffffff", stroke: "#1f2937", strokeWidth: 2, strokeStyle: "solid", roughness: 0, edges: "round" } }),
    tool: { label: "Screen", icon: "📱" },
    properties: [...SIZE_PROPERTIES, ...RECT_STYLE_PROPERTIES, ROLE_PROPERTY],
    render: ({ node, x, y, w, h, fill, stroke, strokeWidth, renderChildren }) => {
      const opacity = clampOpacity(node.opacity);
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
    properties: [...SIZE_PROPERTIES, ...RECT_STYLE_PROPERTIES, ...RECT_TEXT_PROPERTIES, ROLE_PROPERTY],
    render: ({ node, x, y, w, h, fill, stroke, strokeWidth, renderChildren }) => {
      const corner = getCornerRadius(node);
      return (
        <g opacity={clampOpacity(node.opacity)} filter={getRoughFilter(node)}>
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
      { key: "gap", label: "Gap", type: "number", group: "Layout" },
      { key: "padding", label: "Padding", type: "number", group: "Layout" },
      { key: "direction", label: "Direction", type: "buttonGroup", group: "Layout", options: [{ label: "Column", value: "column", icon: "↕" }, { label: "Row", value: "row", icon: "↔" }] },
      ...SIZE_PROPERTIES,
      ...RECT_STYLE_PROPERTIES,
      ROLE_PROPERTY,
    ],
    render: ({ node, x, y, w, h, fill, stroke, strokeWidth, renderChildren }) => {
      const corner = getCornerRadius(node);
      return (
        <g opacity={clampOpacity(node.opacity)} filter={getRoughFilter(node)}>
          <rect x={x} y={y} width={w} height={h} rx={corner} ry={corner} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={getStrokeDasharray(node)} strokeLinejoin="round" strokeLinecap="round" />
          {renderChildren()}
        </g>
      );
    },
  },
  {
    kind: "ellipse",
    create: (id, x, y) => ({ kind: "ellipse", id, x, y, w: 100, h: 100, text: "", opacity: 100, style: { fill: "none", stroke: "#1f2937", strokeWidth: 2, strokeStyle: "solid", roughness: 1, text: { color: "#1f2937", font: "Inter, sans-serif", size: 18, align: "center", opacity: 100 } } }),
    tool: { label: "Ellipse", icon: "◯" },
    properties: [...SIZE_PROPERTIES, ...SHAPE_STYLE_PROPERTIES, ...BOUND_TEXT_PROPERTIES, ROLE_PROPERTY],
    render: ({ node, x, y, w, h, fill, stroke, strokeWidth, renderChildren }) => (
      <g opacity={clampOpacity(node.opacity)} filter={getRoughFilter(node)}>
        <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={getStrokeDasharray(node)} />
        {renderNodeLabel(node, x, y, w, h)}
        {renderChildren()}
      </g>
    ),
  },
  {
    kind: "diamond",
    create: (id, x, y) => ({ kind: "diamond", id, x, y, w: 100, h: 100, text: "", opacity: 100, style: { fill: "none", stroke: "#1f2937", strokeWidth: 2, strokeStyle: "solid", roughness: 1, text: { color: "#1f2937", font: "Inter, sans-serif", size: 18, align: "center", opacity: 100 } } }),
    tool: { label: "Diamond", icon: "◇" },
    properties: [...SIZE_PROPERTIES, ...SHAPE_STYLE_PROPERTIES, ...BOUND_TEXT_PROPERTIES, ROLE_PROPERTY],
    render: ({ node, x, y, w, h, fill, stroke, strokeWidth, renderChildren }) => {
      const pts = `${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`;
      return (
        <g opacity={clampOpacity(node.opacity)} filter={getRoughFilter(node)}>
          <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={getStrokeDasharray(node)} strokeLinejoin="round" strokeLinecap="round" />
          {renderNodeLabel(node, x, y, w, h)}
          {renderChildren()}
        </g>
      );
    },
  },
  {
    kind: "sticky",
    create: (id, x, y) => ({ kind: "sticky", id, x, y, w: 120, h: 120, style: { fill: "#fef08a", stroke: "#1f2937", strokeWidth: 2, strokeStyle: "solid" }, text: "" }),
    tool: { label: "Sticky", icon: "📝" },
    properties: [
      { key: "text", label: "Text", type: "text", group: "Content" },
      { key: "style.stroke", label: "Stroke", type: "color", group: "Stroke", options: STROKE_COLORS },
      { key: "style.fill", label: "Background", type: "color", group: "Background", options: FILL_COLORS.filter((option) => option.value !== "none") },
      { key: "style.strokeWidth", label: "Stroke width", type: "buttonGroup", group: "Stroke width", options: STROKE_WIDTH_OPTIONS },
      { key: "style.strokeStyle", label: "Stroke style", type: "buttonGroup", group: "Stroke style", options: STROKE_STYLE_OPTIONS },
      { key: "opacity", label: "Opacity", type: "slider", group: "Opacity", min: 0, max: 100, step: 1 },
      ROLE_PROPERTY,
    ],
    render: ({ node, x, y, w, h, stroke, strokeWidth, renderChildren }) => {
      const rectFill = node.style?.fill ?? "#fef08a";
      return (
        <g opacity={clampOpacity(node.opacity)}>
          <rect x={x} y={y} width={w} height={h} rx={2} ry={2} fill={rectFill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={getStrokeDasharray(node)} style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" }} />
          {renderChildren()}
        </g>
      );
    },
  },
  {
    kind: "arrow",
    create: (id, x, y) => ({
      kind: "arrow",
      id,
      x,
      y,
      w: 160,
      h: 0,
      points: [[0, 0], [160, 0]],
      startHead: "none",
      endHead: "arrow",
      route: "straight",
      opacity: 100,
      style: { stroke: "#1f2937", strokeWidth: 2, strokeStyle: "solid", roughness: 1 },
    }),
    tool: { label: "Arrow", icon: "→" },
    properties: [...ARROW_PROPERTIES, ROLE_PROPERTY],
    render: ({ node, x, y, w, h, resolveNodeById }) => {
      const points = getRenderedLinearPoints(node, x, y, w, h, resolveNodeById);
      const stroke = node.style?.stroke ?? "#1f2937";
      const strokeWidth = Number(node.style?.strokeWidth ?? 2);
      return (
        <g opacity={clampOpacity(node.opacity)} filter={getRoughFilter(node)}>
          <path d={buildLinearPath(points, node.route)} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={getStrokeDasharray(node)} strokeLinecap="round" strokeLinejoin="round" />
          {renderArrowHead(node.startHead, getTerminalSegment(points, true), stroke, strokeWidth)}
          {renderArrowHead(node.endHead, getTerminalSegment(points, false), stroke, strokeWidth)}
        </g>
      );
    },
  },
  {
    kind: "line",
    create: (id, x, y) => ({ kind: "line", id, x, y, w: 120, h: 0, points: [[0, 0], [120, 0]], opacity: 100, style: { stroke: "#1f2937", strokeWidth: 2, strokeStyle: "solid", roughness: 1 } }),
    tool: { label: "Line", icon: "╱" },
    properties: [...LINE_PROPERTIES, ROLE_PROPERTY],
    render: ({ node, x, y, w, h, resolveNodeById }) => {
      const points = getRenderedLinearPoints(node, x, y, w, h, resolveNodeById);
      return <path d={buildLinearPath(points, "straight")} fill="none" stroke={node.style?.stroke ?? "#1f2937"} strokeWidth={Number(node.style?.strokeWidth ?? 2)} strokeDasharray={getStrokeDasharray(node)} opacity={clampOpacity(node.opacity)} filter={getRoughFilter(node)} strokeLinecap="round" strokeLinejoin="round" />;
    },
  },
  {
    kind: "freehand",
    create: (id, x, y) => ({
      kind: "freehand",
      id,
      x,
      y,
      w: 120,
      h: 40,
      points: [[0, 22], [24, 8], [48, 28], [72, 12], [96, 26], [120, 18]],
      opacity: 100,
      style: { stroke: "#1f2937", strokeWidth: 2, strokeStyle: "solid", roughness: 1 },
    }),
    tool: { label: "Freedraw", icon: "✏" },
    properties: [...FREEHAND_PROPERTIES, ROLE_PROPERTY],
    render: ({ node, x, y, w, h }) => {
      const points = getLinearPoints(node, x, y, w, h);
      return <polyline points={points.map((point) => point.join(",")).join(" ")} fill="none" stroke={node.style?.stroke ?? "#1f2937"} strokeWidth={Number(node.style?.strokeWidth ?? 2)} strokeDasharray={getStrokeDasharray(node)} opacity={clampOpacity(node.opacity)} filter={getRoughFilter(node)} strokeLinecap="round" strokeLinejoin="round" />;
    },
  },
  {
    kind: "text",
    create: (id, x, y) => ({ kind: "text", id, x, y, text: "New Text", opacity: 100, style: { text: { font: "Inter, sans-serif", size: 20, weight: 500, color: "#0f172a", align: "left", opacity: 100 } } }),
    tool: { label: "Text", icon: "T" },
    properties: [
      { key: "text", label: "Text", type: "text", group: "Content" },
      { key: "style.text.color", label: "Color", type: "color", group: "Text", options: STROKE_COLORS },
      { key: "style.text.size", label: "Size", type: "number", group: "Text" },
      { key: "style.text.font", label: "Font", type: "select", group: "Text", options: [{ label: "Inter", value: "Inter, sans-serif" }, { label: "Arial", value: "Arial, sans-serif" }, { label: "Georgia", value: "Georgia, serif" }, { label: "Monospace", value: "Menlo, Consolas, monospace" }] },
      { key: "style.text.align", label: "Align", type: "buttonGroup", group: "Text", options: [{ label: "Left", value: "left", icon: "≡" }, { label: "Center", value: "center", icon: "≣" }, { label: "Right", value: "right", icon: "≢" }] },
      { key: "opacity", label: "Opacity", type: "slider", group: "Opacity", min: 0, max: 100, step: 1 },
      ROLE_PROPERTY,
    ],
    render: ({ node, x, y, w, h }) => {
      const txtSize = Number(node.style?.text?.size ?? 20);
      const weight = Number(node.style?.text?.weight ?? 500);
      const align = node.style?.text?.align ?? "left";
      const padX = 8;
      const txt = node.text || "";
      const estW = Math.max(w, txt.length * (txtSize * 0.6) + padX * 2);
      const anchor = align === "center" ? "middle" : align === "left" ? "start" : "end";
      const tx = align === "center" ? x + estW / 2 : align === "left" ? x + padX : x + estW - padX;
      const ty = y + h / 2 + txtSize * 0.35;
      return <text x={tx} y={ty} textAnchor={anchor} fontSize={txtSize} fontWeight={weight} fontFamily={node.style?.text?.font ?? "Inter, sans-serif"} fill={node.style?.text?.color ?? "#0f172a"} opacity={clampOpacity(node.style?.text?.opacity ?? node.opacity)}>{txt}</text>;
    },
  },
  {
    kind: "image",
    create: (id, x, y) => ({ kind: "image", id, x, y, src: IMAGE_PLACEHOLDER, w: 100, h: 100, opacity: 100 }),
    tool: { label: "Image", icon: "🖼" },
    properties: [{ key: "src", label: "Source", type: "text", group: "Content" }, ...SIZE_PROPERTIES, { key: "opacity", label: "Opacity", type: "slider", group: "Opacity", min: 0, max: 100, step: 1 }, ROLE_PROPERTY],
    render: ({ node, x, y, w, h }) => <image x={x} y={y} width={w} height={h} href={node.src} preserveAspectRatio="xMidYMid meet" opacity={clampOpacity(node.opacity)} />,
  },
];
