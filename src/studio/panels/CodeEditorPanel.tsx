import React from "react";

type Props = {
  open: boolean;
  src: string;
  errors: any[];
  onChangeSrc: (next: string) => void;
  onClose: () => void;
  onRebuild: () => void;
  onToggle: () => void;
};

export function CodeEditorPanel({ open, src, errors, onChangeSrc, onClose, onRebuild, onToggle }: Props) {
  return (
    <div style={styles.shell}>
      {open ? (
        <div style={styles.panel}>
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <span style={styles.icon}>⟨/⟩</span>
              <h2 style={styles.title}>WFML</h2>
            </div>
            <button style={styles.closeBtn} onClick={onClose} title="Close (Ctrl+E)">✕</button>
          </div>
          <textarea
            style={styles.textarea}
            value={src}
            onChange={(e) => onChangeSrc(e.target.value)}
            spellCheck={false}
          />
          {errors.length ? (
            <div style={styles.errors}>
              {errors.map((e: any, i: number) => (
                <div key={i} style={styles.errorLine}>
                  <span style={styles.errorBadge}>L{e.line}</span> {e.message}
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.validBar}>✓ Valid WFML</div>
          )}
          <button type="button" style={styles.rebuildBtn} onClick={onRebuild}>Re-render</button>
        </div>
      ) : null}
      <button
        style={styles.tab(open)}
        onClick={onToggle}
        title="Toggle WFML Panel (Ctrl+E)"
      >
        ⟨/⟩
      </button>
    </div>
  );
}

const styles = {
  shell: {
    display: "flex",
    flexShrink: 0,
    position: "relative",
    height: "100%",
  } as React.CSSProperties,
  panel: {
    width: 360,
    height: "100%",
    background: "#0f172a",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderRight: "1px solid #1e293b",
  } as React.CSSProperties,
  tab: (open: boolean) => ({
    position: "absolute",
    top: "50%",
    left: 0,
    transform: "translateY(-50%)",
    width: 24,
    height: 64,
    borderRadius: "0 8px 8px 0",
    border: open ? "none" : "1px solid #334155",
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    background: "#1e293b",
    color: "#94a3b8",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "ui-monospace, Menlo, monospace",
    writingMode: open ? "horizontal-tb" : "vertical-lr",
    boxShadow: "2px 0 8px rgba(0,0,0,0.3)",
    zIndex: 20,
    padding: 0,
  }) as React.CSSProperties,
  header: {
    padding: "16px 16px 0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 48,
  } as React.CSSProperties,
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  } as React.CSSProperties,
  icon: {
    fontSize: 18,
    color: "#38bdf8",
    fontFamily: "ui-monospace, Menlo, monospace",
    fontWeight: 700,
  } as React.CSSProperties,
  title: {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
    color: "#f1f5f9",
    letterSpacing: 0.5,
  } as React.CSSProperties,
  closeBtn: {
    border: "none",
    background: "transparent",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: 16,
    padding: "4px 8px",
    borderRadius: 4,
  } as React.CSSProperties,
  textarea: {
    flex: 1,
    border: "none",
    outline: "none",
    padding: 16,
    fontFamily: "ui-monospace, Menlo, Consolas, monospace",
    fontSize: 12,
    lineHeight: 1.6,
    resize: "none",
    width: "100%",
    boxSizing: "border-box",
    background: "#0f172a",
    color: "#e2e8f0",
  } as React.CSSProperties,
  errors: {
    padding: "0 16px",
    fontSize: 12,
    fontFamily: "ui-monospace, Menlo, monospace",
  } as React.CSSProperties,
  errorLine: {
    padding: "6px 10px",
    color: "#fca5a5",
    background: "#7f1d1d33",
    borderRadius: 4,
    marginBottom: 4,
    fontSize: 11,
  } as React.CSSProperties,
  errorBadge: {
    color: "#fb923c",
    fontWeight: 700,
    marginRight: 6,
  } as React.CSSProperties,
  validBar: {
    padding: "8px 16px",
    fontSize: 11,
    color: "#86efac",
    fontFamily: "ui-monospace, Menlo, monospace",
  } as React.CSSProperties,
  rebuildBtn: {
    margin: "8px 16px 16px",
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 12,
  } as React.CSSProperties,
};
