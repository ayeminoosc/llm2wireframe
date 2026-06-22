import React from "react";
import type { Camera } from "../../engine/camera";

type Props = {
  camera: Camera;
  isPanning: boolean;
  cursor?: React.CSSProperties["cursor"];
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerLeave: (e: React.PointerEvent<HTMLDivElement>) => void;
  onWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
  children: React.ReactNode;
};

export function CanvasShell({ camera, isPanning, cursor = "default", onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onWheel, children }: Props) {
  return (
    <div
      style={{ ...styles.canvas, cursor: isPanning ? "grabbing" : cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onWheel={onWheel}
    >
      <svg width="100%" height="100%" style={styles.svg}>
        <defs>
          <filter id="rough-1" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="11" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.8" />
          </filter>
          <filter id="rough-2" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="11" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.6" />
          </filter>
          <filter id="rough-3" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="11" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.4" />
          </filter>
        </defs>
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
