import React from "react";
import type { NodeDefinition } from "../../engine/registry";

type Props = {
  tools: NodeDefinition[];
  onInsert: (kind: string) => void;
};

export function Toolbar({ tools, onInsert }: Props) {
  return (
    <div style={styles.toolbar}>
      {tools.map((tool) => (
        <React.Fragment key={tool.kind}>
          {tool.tool?.separatorBefore ? <div style={styles.separator} /> : null}
          <button style={styles.toolBtn} onClick={() => onInsert(tool.kind)}>
            {tool.tool?.icon} {tool.tool?.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

const styles = {
  toolbar: {
    position: "absolute",
    top: 24,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: 8,
    padding: 8,
    background: "#fff",
    borderRadius: 8,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    zIndex: 10,
  } as React.CSSProperties,
  toolBtn: {
    padding: "8px 12px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    borderRadius: 4,
    fontWeight: 600,
    color: "#475569",
  } as React.CSSProperties,
  separator: {
    width: 1,
    background: "#e2e8f0",
    margin: "0 4px",
  } as React.CSSProperties,
};
