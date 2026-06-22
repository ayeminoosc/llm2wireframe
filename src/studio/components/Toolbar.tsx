import React from "react";
import type { NodeDefinition } from "../../engine/registry";

type Props = {
  tools: NodeDefinition[];
  onInsert: (kind: string) => void;
  activeToolKind?: string | null;
  actions?: { key: string; label: string; disabled?: boolean; active?: boolean; onClick: () => void }[];
};

export function Toolbar({ tools, onInsert, activeToolKind = null, actions = [] }: Props) {
  return (
    <div style={styles.toolbar}>
      {tools.map((tool) => (
        <React.Fragment key={tool.kind}>
          {tool.tool?.separatorBefore ? <div style={styles.separator} /> : null}
          <button style={{ ...styles.toolBtn, ...(activeToolKind === tool.kind ? styles.toolBtnActive : null) }} onClick={() => onInsert(tool.kind)}>
            {tool.tool?.icon} {tool.tool?.label}
          </button>
        </React.Fragment>
      ))}
      {actions.length ? <div style={styles.separator} /> : null}
      {actions.map((action) => (
        <button key={action.key} style={{ ...styles.toolBtn, ...(action.active ? styles.toolBtnActive : null), opacity: action.disabled ? 0.5 : 1 }} onClick={action.onClick} disabled={action.disabled}>
          {action.label}
        </button>
      ))}
    </div>
  );
}

const styles = {
  toolbar: {
    position: "absolute",
    top: 24,
    left: 24,
    right: 24,
    display: "flex",
    gap: 8,
    padding: 8,
    background: "#fff",
    borderRadius: 8,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    zIndex: 10,
    overflowX: "auto",
    alignItems: "center",
    whiteSpace: "nowrap",
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
  toolBtnActive: {
    background: "#e0e7ff",
    color: "#3730a3",
  } as React.CSSProperties,
  separator: {
    width: 1,
    background: "#e2e8f0",
    margin: "0 4px",
  } as React.CSSProperties,
};
