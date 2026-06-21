function inferRole(node: any): { role?: string; confidence?: number } {
  const name = String(node.name || node.id || "").toLowerCase();
  const text = String(node.text || "").toLowerCase();

  if (node.kind === "frame") return { role: "screen", confidence: 0.95 };
  if (node.kind === "flex") return { role: "stack", confidence: 0.85 };
  if (node.kind === "sticky") return { role: "note", confidence: 0.95 };
  if (node.kind === "image") return { role: "media", confidence: 0.9 };
  if (node.kind === "line" || node.kind === "arrow") return { role: "connector", confidence: 0.9 };
  if (node.kind === "text") {
    if (name.includes("title") || name.includes("heading") || text.length <= 40) return { role: "label", confidence: 0.7 };
    return { role: "text", confidence: 0.65 };
  }
  if (node.kind === "rect") {
    if (name.includes("btn") || name.includes("button") || text.includes("sign in") || text.includes("continue")) return { role: "button", confidence: 0.75 };
    if (name.includes("input") || name.includes("field") || name.includes("email") || name.includes("password")) return { role: "input", confidence: 0.7 };
    return { role: "container", confidence: 0.55 };
  }
  return { role: node.kind, confidence: 0.5 };
}

function walk(nodes: any[]) {
  for (const node of nodes) {
    const inferred = inferRole(node);
    node.semantic = {
      ...(node.semantic || {}),
      ...inferred,
      inferred: true,
    };
    if (node.children) walk(node.children);
  }
}

export function inferDocumentSemantics(doc: any) {
  if (!doc?.children) return doc;
  walk(doc.children);
  return doc;
}
