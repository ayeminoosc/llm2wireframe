import React from "react";
import type { NodeDefinition, NodePropertyDefinition } from "../../engine/registry";
import type { ViewerNode } from "../../engine/scene";

type Props = {
  selectedNode: ViewerNode | null;
  definition?: NodeDefinition;
  editingTextNodeId?: string | null;
  onChangeProperty: (property: NodePropertyDefinition, rawValue: string) => void;
  onChangeInstanceOverride: (propName: string, rawValue: string) => void;
};

function getDeepValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function groupProperties(properties: NodePropertyDefinition[]) {
  const groups = new Map<string, NodePropertyDefinition[]>();
  for (const property of properties) {
    const key = property.group || "General";
    groups.set(key, [...(groups.get(key) || []), property]);
  }
  return Array.from(groups.entries());
}

function renderSwatchFill(swatch?: string) {
  if (swatch === "checker") {
    return "linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%), linear-gradient(45deg, #e5e7eb 25%, transparent 25%, transparent 75%, #e5e7eb 75%)";
  }
  return swatch || "#ffffff";
}

export function PropertyInspectorPanel({ selectedNode, definition, editingTextNodeId = null, onChangeProperty, onChangeInstanceOverride }: Props) {
  const properties = (definition?.properties || []).filter((property) => {
    if (selectedNode?.kind !== "rect") return true;
    const isRectTextProperty = property.key === "text" || property.key.startsWith("style.text.");
    if (!isRectTextProperty) return true;
    return editingTextNodeId === selectedNode.id;
  });
  const propertyGroups = groupProperties(properties);
  const instanceProps = selectedNode?.isInstanceRoot ? Object.entries(selectedNode.componentProps || {}) : [];
  const isInstance = Boolean(selectedNode?.isInstanceRoot);

  const renderControl = (property: NodePropertyDefinition, value: any, onChange: (nextValue: string) => void) => {
    if (property.type === "color" && property.options?.length) {
      return (
        <div style={styles.swatchRow}>
          {property.options.map((option) => {
            const selected = String(value ?? "") === option.value;
            return (
              <button key={option.value} type="button" title={option.label} onClick={() => onChange(option.value)} style={{ ...styles.swatchButton, ...(selected ? styles.swatchButtonSelected : null) }}>
                <span style={{ ...styles.swatchFill, background: renderSwatchFill(option.swatch), backgroundSize: option.swatch === "checker" ? "10px 10px" : undefined, backgroundPosition: option.swatch === "checker" ? "0 0, 5px 5px" : undefined }} />
              </button>
            );
          })}
        </div>
      );
    }

    if (property.type === "buttonGroup" && property.options?.length) {
      return (
        <div style={styles.buttonGroup}>
          {property.options.map((option) => {
            const selected = String(value ?? "") === option.value;
            return (
              <button key={option.value} type="button" title={option.label} onClick={() => onChange(option.value)} style={{ ...styles.optionButton, ...(selected ? styles.optionButtonSelected : null) }}>
                {option.icon || option.label}
              </button>
            );
          })}
        </div>
      );
    }

    if (property.type === "select") {
      return (
        <select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} style={styles.input}>
          {(property.options || []).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      );
    }

    if (property.type === "slider") {
      const min = property.min ?? 0;
      const max = property.max ?? 100;
      const step = property.step ?? 1;
      return (
        <div style={styles.sliderWrap}>
          <input type="range" min={min} max={max} step={step} value={Number(value ?? max)} onChange={(e) => onChange(e.target.value)} style={styles.slider} />
          <div style={styles.sliderLabels}>
            <span>{min}</span>
            <span>{max}</span>
          </div>
        </div>
      );
    }

    if (property.type === "number") {
      return <input type="number" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} style={styles.input} />;
    }

    if (property.type === "color") {
      return <input type="color" value={String(value ?? "#000000")} onChange={(e) => onChange(e.target.value)} style={styles.input} />;
    }

    return <input type="text" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} style={styles.input} />;
  };

  return (
    <div style={styles.panel}>
      <div style={styles.header}>Properties</div>
      {!selectedNode ? <div style={styles.empty}>Select a node to inspect it.</div> : null}
      {selectedNode && !isInstance && properties.length === 0 ? <div style={styles.empty}>No editable properties for `{selectedNode.kind}` yet.</div> : null}
      {selectedNode && isInstance ? (
        <div style={styles.form}>
          <div style={styles.kindRow}>component `{selectedNode.componentName}`</div>
          {selectedNode.semantic?.role ? <div style={styles.roleRow}>Role: {selectedNode.semantic.role}</div> : null}
          {instanceProps.length === 0 ? <div style={styles.emptyInline}>No exposed props yet.</div> : null}
          {instanceProps.map(([propName, spec]) => {
            const value = selectedNode.overrides && propName in selectedNode.overrides ? selectedNode.overrides[propName] : spec.default;
            return (
              <label key={propName} style={styles.field}>
                <span style={styles.label}>{spec.label || propName}</span>
                <input type={spec.type === "number" ? "number" : spec.type === "color" ? "color" : "text"} value={spec.type === "color" ? String(value ?? "#000000") : String(value ?? "")} onChange={(e) => onChangeInstanceOverride(propName, e.target.value)} style={styles.input} />
              </label>
            );
          })}
        </div>
      ) : null}
      {selectedNode && !isInstance && properties.length > 0 ? (
        <div style={styles.form}>
          <div style={styles.kindRow}>{selectedNode.kind} `#{selectedNode.id}`</div>
          {propertyGroups.map(([groupName, group]) => (
            <div key={groupName} style={styles.section}>
              <div style={styles.sectionTitle}>{groupName}</div>
              {groupName === "Size" ? (
                <div style={styles.sizeGrid}>
                  {group.map((property) => {
                    const value = getDeepValue(selectedNode, property.key);
                    return (
                      <label key={property.key} style={styles.field}>
                        <span style={styles.label}>{property.label}</span>
                        {renderControl(property, value, (nextValue) => onChangeProperty(property, nextValue))}
                      </label>
                    );
                  })}
                </div>
              ) : group.length === 1 ? (
                renderControl(group[0], getDeepValue(selectedNode, group[0].key), (nextValue) => onChangeProperty(group[0], nextValue))
              ) : (
                <div style={styles.groupStack}>
                  {group.map((property) => {
                    const value = getDeepValue(selectedNode, property.key);
                    return (
                      <label key={property.key} style={styles.field}>
                        <span style={styles.label}>{property.label}</span>
                        {renderControl(property, value, (nextValue) => onChangeProperty(property, nextValue))}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
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
    maxHeight: "calc(100vh - 140px)",
    overflowY: "auto",
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
    border: "1px solid #e2e8f0",
    zIndex: 10,
  } as React.CSSProperties,
  header: {
    padding: "12px 16px",
    borderBottom: "1px solid #e5e7eb",
    fontWeight: 700,
    fontSize: 14,
    position: "sticky",
    top: 0,
    background: "#fff",
    zIndex: 1,
  } as React.CSSProperties,
  empty: {
    padding: 16,
    color: "#64748b",
    fontSize: 13,
  } as React.CSSProperties,
  emptyInline: {
    color: "#64748b",
    fontSize: 13,
  } as React.CSSProperties,
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 16,
  } as React.CSSProperties,
  kindRow: {
    fontSize: 12,
    color: "#475569",
    fontFamily: "ui-monospace, Menlo, Consolas, monospace",
  } as React.CSSProperties,
  roleRow: {
    fontSize: 12,
    color: "#334155",
    fontWeight: 600,
  } as React.CSSProperties,
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: "#475569",
  } as React.CSSProperties,
  groupStack: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  } as React.CSSProperties,
  sizeGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
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
    background: "#fff",
  } as React.CSSProperties,
  swatchRow: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  } as React.CSSProperties,
  swatchButton: {
    width: 24,
    height: 24,
    padding: 0,
    borderRadius: 7,
    border: "2px solid transparent",
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as React.CSSProperties,
  swatchButtonSelected: {
    borderColor: "#1e1b4b",
  } as React.CSSProperties,
  swatchFill: {
    width: 20,
    height: 20,
    borderRadius: 5,
    border: "1px solid #e5e7eb",
    display: "block",
  } as React.CSSProperties,
  buttonGroup: {
    display: "flex",
    gap: 8,
  } as React.CSSProperties,
  optionButton: {
    minWidth: 40,
    minHeight: 40,
    borderRadius: 10,
    border: "1px solid #ececf4",
    background: "#f8f8fc",
    color: "#111827",
    cursor: "pointer",
    fontSize: 16,
    lineHeight: 1,
  } as React.CSSProperties,
  optionButtonSelected: {
    background: "#e5e7ff",
    borderColor: "#c7d2fe",
    color: "#312e81",
  } as React.CSSProperties,
  sliderWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  } as React.CSSProperties,
  slider: {
    width: "100%",
    accentColor: "#a5b4fc",
  } as React.CSSProperties,
  sliderLabels: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: "#64748b",
  } as React.CSSProperties,
};
