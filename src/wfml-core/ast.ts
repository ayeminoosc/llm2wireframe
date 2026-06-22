export interface WFDocument {
  type: "wfdoc";
  meta: { version?: string; author?: string; seed?: number; [k: string]: any } & NodeTrivia;
  assets: Asset[];
  components: Component[];
  children: Node[];
}

export interface NodeTrivia { comments?: string[] }

export interface Asset extends NodeTrivia {
  id: string;
  kind: "image" | "font" | "iconpack";
  src: string;
  meta?: any;
}

export interface Component extends NodeTrivia {
  id: string;
  name: string;
  nodes: Node[];
  props?: Record<string, PropSpec>;
  semantic?: SemanticMeta;
}

export interface PropSpec {
  type: "string" | "number" | "boolean" | "color" | "image";
  default?: any;
  label?: string;
  description?: string;
  bindings?: PropBinding[];
}

export interface PropBinding {
  nodeId: string;
  field: string;
}

export interface Frame extends NodeBase {
  kind: "frame";
  w: number;
  h: number;
  name?: string;
  children: Node[];
}

export interface Node extends NodeBase {
  kind: string;
  [key: string]: any;
}

export interface NodeBase extends NodeTrivia {
  id: string;
  name?: string;
  z?: number;
  lock?: boolean;
  hidden?: boolean;
  opacity?: number;
  x?: number;
  y?: number;
  w?: number | "fill" | "hug" | "auto";
  h?: number | "fill" | "hug" | "auto";
  rotation?: number;
  place?: PlacementRule[];
  tags?: string[];
  semantic?: SemanticMeta;
  extra?: Record<string, any>;
  style?: Style;
  children?: Node[];
}

export interface SemanticMeta {
  role?: string;
  inferred?: boolean;
  confidence?: number;
}

export interface Style {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
  dash?: number[];
  corner?: number;
  edges?: "sharp" | "round";
  shadow?: { blur: number; x: number; y: number; color: string };
  sketch?: boolean;
  roughness?: number;
  seed?: number;
  text?: TextStyle;
}

export interface TextStyle {
  font?: string;
  size?: number;
  weight?: number;
  color?: string;
  opacity?: number;
  align?: "left" | "center" | "right";
  wrap?: boolean;
  autoSize?: boolean;
}

export interface Rect extends NodeBase { kind: "rect" }
export interface Ellipse extends NodeBase { kind: "ellipse" }
export interface Diamond extends NodeBase { kind: "diamond" }
export interface TextNode extends NodeBase { kind: "text"; text: string }
export interface Icon extends NodeBase { kind: "icon"; name: string; pack?: string }
export interface ImageNode extends NodeBase { kind: "image"; src: string; fit?: "cover" | "contain" | "stretch" }

export interface ConnectorBase extends NodeBase {
  from?: AnchorRef;
  to?: AnchorRef;
  label?: string;
  points?: [number, number][];
}

export interface Line extends ConnectorBase { kind: "line" }
export interface Arrow extends ConnectorBase {
  kind: "arrow";
  startHead?: ArrowHead;
  endHead?: ArrowHead;
  route?: "straight" | "orthogonal" | "curve";
}

export interface Polyline extends NodeBase { kind: "polyline"; points?: [number, number][] }
export interface Freehand extends NodeBase { kind: "freehand"; points?: [number, number][] }
export interface Sticky extends NodeBase { kind: "sticky"; text: string; color?: string }
export interface Group extends NodeBase { kind: "group"; children: Node[] }
export interface Instance extends NodeBase { kind: "instance"; of: string; overrides?: Record<string, any> }

export type ArrowHead = "none" | "arrow" | "triangle" | "circle" | "diamond" | "bar";
export type AnchorRef = { ref: string; anchor?: "center" | "top" | "bottom" | "left" | "right" | "auto" };

export type PlacementRule =
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
