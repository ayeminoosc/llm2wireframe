import React from "react";
import type { NodeDefinition, NodePropertyDefinition } from "../../engine/registry";
import type { ViewerNode } from "../../engine/scene";

type Props = {
  selectedNode: ViewerNode | null;
  definition?: NodeDefinition;
  onChangeProperty: (property: NodePropertyDefinition, rawValue: string) => void;
};

function getDeepValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

export function PropertyInspectorPanel({ selectedNode, definition, onChangeProperty }: Props) {
  const properties = definition?.properties || [];

  return (
    <div style={styles.panel}>
      <div style={styles.header}>Properties</div>
      {!selectedNode ? <div style={styles.empty}>Select a node to inspect it.</div> : null}
      {selectedNode && properties.length === 0 ? <div style={styles.empty}>No editable properties for `{selectedNode.kind}` yet.</div> : null}
      {selectedNode && properties.length > 0 ? (
        <div style={styles.form}>
          <div style={styles.kindRow}>{selectedNode.kind} `#{selectedNode.id}`</div>
          {properties.map((property) => {
            const value = getDeepValue(selectedNode, property.key);
            return (
              <label key={property.key} style={styles.field}>
                <span style={styles.label}>{property.label}</span>
                {property.type === "select" ? (
                  <select value={String(value ?? "")} onChange={(e) => onChangeProperty(property, e.target.value)} style={styles.input}>
                    {(property.options || []).map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={property.type === "number" ? "number" : property.type === "color" ? "color" : "text"}
                    value={property.type === "color" ? String(value ?? "#000000") : String(value ?? "")}
                    onChange={(e) => onChangeProperty(property, e.target.value)}
                    style={styles.input}
                  />
                )}
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  panel: {
    position: "absolute",
    top: 88,
    right: 24,
    width: 280,
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
    border: "1px solid #e2e8f0",
    zIndex: 10,
    overflow: "hidden",
  } as React.CSSProperties,
  header: {
    padding: "12px 16px",
    borderBottom: "1px solid #e5e7eb",
    fontWeight: 700,
    fontSize: 14,
  } as React.CSSProperties,
  empty: {
    padding: 16,
    color: "#64748b",
    fontSize: 13,
  } as React.CSSProperties,
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 16,
  } as React.CSSProperties,
  kindRow: {
    fontSize: 12,
    color: "#475569",
    fontFamily: "ui-monospace, Menlo, Consolas, monospace",
  } as React.CSSProperties,
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  } as React.CSSProperties,
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "#334155",
  } as React.CSSProperties,
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 13,
  } as React.CSSProperties,
};
