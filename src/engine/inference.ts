function walk(nodes: any[]) {
  for (const node of nodes) {
    if (node.semantic?.role) {
      node.semantic = {
        ...node.semantic,
        inferred: false,
      };
    }
    if (node.children) walk(node.children);
  }
}

export function inferDocumentSemantics(doc: any) {
  if (!doc?.children) return doc;
  walk(doc.children);
  return doc;
}
