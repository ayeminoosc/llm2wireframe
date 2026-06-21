import React from "react";

type Props = {
  nodeId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isSelected: boolean;
  isDragging: boolean;
  nodeRefs: React.MutableRefObject<Record<string, SVGGElement | null>>;
  onPointerDown: (e: React.PointerEvent<SVGElement>, nodeId: string) => void;
  children: React.ReactNode;
};

export function NodeWrapper({ nodeId, x, y, w, h, isSelected, isDragging, nodeRefs, onPointerDown, children }: Props) {
  return (
    <g
      ref={(el) => {
        nodeRefs.current[nodeId] = el;
      }}
      onPointerDown={(e) => onPointerDown(e, nodeId)}
      style={{ cursor: isDragging ? "grabbing" : "grab", opacity: isDragging ? 0.8 : 1 }}
    >
      {children}
      {isSelected ? <rect x={x} y={y} width={w} height={h} fill="none" stroke="#3b82f6" strokeWidth={2} style={{ pointerEvents: "none" }} /> : null}
    </g>
  );
}
