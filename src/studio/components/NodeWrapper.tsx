import React from "react";

type Props = {
  nodeId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  disabled?: boolean;
  isSelected: boolean;
  isDragging: boolean;
  canResize?: boolean;
  rotation?: number;
  nodeRefs: React.MutableRefObject<Record<string, SVGGElement | null>>;
  rotatedGroupRefs?: React.MutableRefObject<Record<string, SVGGElement | null>>;
  onPointerDown: (e: React.PointerEvent<SVGElement>, nodeId: string) => void;
  onResizeStart?: (e: React.PointerEvent<SVGElement>, nodeId: string, handle: string) => void;
  onDoubleClick?: (nodeId: string) => void;
  children: React.ReactNode;
  overlay?: React.ReactNode;
};

const HANDLE_POSITIONS = {
  nw: { x: 0, y: 0, cursor: "nwse-resize" },
  n: { x: 0.5, y: 0, cursor: "ns-resize" },
  ne: { x: 1, y: 0, cursor: "nesw-resize" },
  e: { x: 1, y: 0.5, cursor: "ew-resize" },
  se: { x: 1, y: 1, cursor: "nwse-resize" },
  s: { x: 0.5, y: 1, cursor: "ns-resize" },
  sw: { x: 0, y: 1, cursor: "nesw-resize" },
  w: { x: 0, y: 0.5, cursor: "ew-resize" },
} as const;

export function NodeWrapper({ nodeId, x, y, w, h, disabled = false, isSelected, isDragging, canResize = true, rotation = 0, nodeRefs, rotatedGroupRefs, onPointerDown, onResizeStart, onDoubleClick, children, overlay = null }: Props) {
  const cx = x + w / 2, cy = y + h / 2;
  const transform = rotation ? `rotate(${rotation}, ${cx}, ${cy})` : undefined;

  return (
    <g
      ref={(el) => { nodeRefs.current[nodeId] = el; }}
      onPointerDown={disabled ? undefined : (e) => onPointerDown(e, nodeId)}
      onDoubleClick={disabled || !onDoubleClick ? undefined : () => onDoubleClick(nodeId)}
      style={{ cursor: disabled ? "crosshair" : isDragging ? "grabbing" : "grab", opacity: isDragging ? 0.8 : 1, pointerEvents: disabled ? "none" : "auto" }}
    >
      <rect x={x} y={y} width={Math.max(w, 1)} height={Math.max(h, 1)} fill="#ffffff" opacity={0.001} stroke="none" />
      <g ref={(el) => { if (rotatedGroupRefs) rotatedGroupRefs.current[nodeId] = el; }} transform={transform || undefined}>
        {children}
        {isSelected ? <rect x={x} y={y} width={w} height={h} fill="none" stroke="#3b82f6" strokeWidth={2} style={{ pointerEvents: "none" }} /> : null}
        {isSelected && !disabled && canResize && onResizeStart ? Object.entries(HANDLE_POSITIONS).map(([handle, position]) => (
          <rect
            key={handle}
            x={x + w * position.x - 5}
            y={y + h * position.y - 5}
            width={10}
            height={10}
            rx={2}
            ry={2}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={1.5}
            style={{ cursor: position.cursor }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onResizeStart(e, nodeId, handle);
            }}
          />
        )) : null}
        {overlay}
      </g>
    </g>
  );
}
