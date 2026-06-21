import React from "react";

type Props = {
  open: boolean;
  src: string;
  errors: any[];
  onChangeSrc: (next: string) => void;
  onClose: () => void;
  onRebuild: () => void;
};

export function CodeEditorPanel({ open, src, errors, onChangeSrc, onClose, onRebuild }: Props) {
  return (
    <div style={styles.codePanel(open)}>
      <div style={styles.codeHeader}>
        <h2 style={styles.title}>WFML Editor</h2>
        <button style={{ ...styles.toolBtn, padding: "4px 8px" }} onClick={onClose}>Close</button>
      </div>
      <textarea style={styles.textarea} value={src} onChange={(e) => onChangeSrc(e.target.value)} spellCheck={false} />
      {errors.length ? <div style={styles.error}>{errors.map((e: any) => `L${e.line}: ${e.message}`).join("\n")}</div> : null}
      <button type="button" style={styles.rebuildBtn} onClick={onRebuild}>Re-render</button>
    </div>
  );
}

const styles = {
  toolBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    borderRadius: 4,
    fontWeight: 600,
    color: "#475569",
  } as React.CSSProperties,
  codePanel: (open: boolean) => ({
    position: "absolute",
    top: 0,
    left: open ? 0 : "-400px",
    width: 400,
    height: "100%",
    background: "#fff",
    boxShadow: "2px 0 20px rgba(0,0,0,0.15)",
    transition: "left 0.3s ease",
    display: "flex",
    flexDirection: "column",
    zIndex: 20,
  }) as React.CSSProperties,
  codeHeader: {
    padding: 16,
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  } as React.CSSProperties,
  title: { margin: 0, fontSize: 16, fontWeight: 700 } as React.CSSProperties,
  textarea: {
    flex: 1,
    border: "none",
    outline: "none",
    padding: 16,
    fontFamily: "ui-monospace, Menlo, Consolas, monospace",
    fontSize: 12,
    resize: "none",
    width: "100%",
    boxSizing: "border-box",
  } as React.CSSProperties,
  error: {
    padding: 16,
    color: "#b91c1c",
    background: "#fef2f2",
    fontSize: 12,
    fontFamily: "ui-monospace, Menlo, Consolas, monospace",
    overflow: "auto",
    maxHeight: 200,
  } as React.CSSProperties,
  rebuildBtn: {
    position: "relative",
    top: 0,
    right: 0,
    margin: 16,
    width: "calc(100% - 32px)",
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: "#2B59FF",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  } as React.CSSProperties,
};
