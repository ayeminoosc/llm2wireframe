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
  nodeRefs: React.MutableRefObject<Record<string, SVGGElement | null>>;
  onPointerDown: (e: React.PointerEvent<SVGElement>, nodeId: string) => void;
  onDoubleClick?: (nodeId: string) => void;
  children: React.ReactNode;
};

export function NodeWrapper({ nodeId, x, y, w, h, disabled = false, isSelected, isDragging, nodeRefs, onPointerDown, onDoubleClick, children }: Props) {
  return (
    <g
      ref={(el) => {
        nodeRefs.current[nodeId] = el;
      }}
      onPointerDown={disabled ? undefined : (e) => onPointerDown(e, nodeId)}
      onDoubleClick={disabled || !onDoubleClick ? undefined : () => onDoubleClick(nodeId)}
      style={{ cursor: disabled ? "crosshair" : isDragging ? "grabbing" : "grab", opacity: isDragging ? 0.8 : 1, pointerEvents: disabled ? "none" : "auto" }}
    >
      <rect x={x} y={y} width={Math.max(w, 1)} height={Math.max(h, 1)} fill="#ffffff" opacity={0.001} stroke="none" />
      {children}
      {isSelected ? <rect x={x} y={y} width={w} height={h} fill="none" stroke="#3b82f6" strokeWidth={2} style={{ pointerEvents: "none" }} /> : null}
    </g>
  );
}
