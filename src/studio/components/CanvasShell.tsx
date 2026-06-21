import React from "react";
import type { Camera } from "../../engine/camera";

type Props = {
  camera: Camera;
  isPanning: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerLeave: (e: React.PointerEvent<HTMLDivElement>) => void;
  onWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
  children: React.ReactNode;
};

export function CanvasShell({ camera, isPanning, onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onWheel, children }: Props) {
  return (
    <div
      style={{ ...styles.canvas, cursor: isPanning ? "grabbing" : "default" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onWheel={onWheel}
    >
      <svg width="100%" height="100%" style={styles.svg}>
        <rect x={0} y={0} width="100%" height="100%" fill="#f5f6fa" />
        <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.z})`}>
          {children}
        </g>
      </svg>
    </div>
  );
}

const styles = {
  canvas: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    position: "absolute",
    top: 0,
    left: 0,
    touchAction: "none",
  } as React.CSSProperties,
  svg: { display: "block", background: "#fff" } as React.CSSProperties,
};
