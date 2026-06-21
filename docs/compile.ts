// Root
interface WFDocument {
  type: "wfdoc";
  meta: { version: string; author?: string; seed?: number };
  assets: Asset[];
  components: Component[];
  children: Node[];
}

interface Asset { id: string; kind: "image" | "font" | "iconpack"; src: string; meta?: any }

interface Component {
  id: string; name: string;
  nodes: Node[]; // shapes/groups/constraints inside component
  props?: Record<string, PropSpec>; // e.g., { label: {type:"string", default:"Button"} }
}

interface Frame extends NodeBase {
  kind: "frame";
  w: number; h: number; name?: string;
  children: Node[];
}

type Node =
  | Rect | Ellipse | Diamond | TextNode | Icon | ImageNode
  | Arrow | Line | Polyline | Sticky | Freehand
  | Group | Instance;

interface NodeBase {
  id: string; name?: string; z?: number; lock?: boolean; hidden?: boolean; opacity?: number;
  x?: number; y?: number; w?: number | "fill" | "hug" | "auto"; h?: number | "fill" | "hug" | "auto"; rotation?: number;
  place?: PlacementRule[]; tags?: string[];
  style?: Style;
  children?: Node[];
}

interface Style {
  fill?: string; stroke?: string; strokeWidth?: number; dash?: number[];
  corner?: number; shadow?: { blur: number; x: number; y: number; color: string };
  sketch?: boolean; roughness?: number; seed?: number;
  text?: TextStyle;
}

interface TextStyle { font?: string; size?: number; weight?: number; align?: "left"|"center"|"right"; wrap?: boolean; autoSize?: boolean }

interface Rect extends NodeBase { kind: "rect" }
interface Ellipse extends NodeBase { kind: "ellipse" }
interface Diamond extends NodeBase { kind: "diamond" }
interface TextNode extends NodeBase { kind: "text"; text: string }
interface Icon extends NodeBase { kind: "icon"; name: string; pack?: string }
interface ImageNode extends NodeBase { kind: "image"; src: string; fit?: "cover"|"contain"|"stretch" }
interface Line extends NodeBase { kind: "line"; from?: AnchorRef; to?: AnchorRef; label?: string }
interface Arrow extends Line { kind: "arrow"; startHead?: ArrowHead; endHead?: ArrowHead; route?: "straight"|"orthogonal"|"curve" }
interface Polyline extends NodeBase { kind: "polyline"; points?: [number,number][] }
interface Freehand extends NodeBase { kind: "freehand"; points?: [number,number][] }
interface Sticky extends NodeBase { kind: "sticky"; text: string; color?: string }
interface Group extends NodeBase { kind: "group"; children: Node[] }
interface Instance extends NodeBase { kind: "instance"; of: string; overrides?: Record<string, any> }

type ArrowHead = "none"|"arrow"|"triangle"|"circle"|"diamond";
type AnchorRef = { ref: string; anchor?: "center"|"top"|"bottom"|"left"|"right"|"auto" }

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
  | { type: "inside"; ref: string; inset?: number | [number,number,number,number] };
