import type { Component, PropSpec, WFDocument } from "../wfml-core/ast";

export function findComponentByName(doc: WFDocument, name: string): Component | null {
  return doc.components.find((component) => component.name === name || component.id === name) ?? null;
}

export function resolveComponentPropValues(component: Component, overrides?: Record<string, any>) {
  const values: Record<string, any> = {};
  for (const [name, spec] of Object.entries(component.props || {})) {
    values[name] = overrides && name in overrides ? overrides[name] : spec.default;
  }
  return values;
}

export function expandComponentInstance(doc: WFDocument, instanceNode: any) {
  const component = findComponentByName(doc, String(instanceNode.of || ""));
  if (!component) return null;

  const propValues = resolveComponentPropValues(component, instanceNode.overrides);
  const children = (component.nodes || []).map((node) => {
    const cloned = JSON.parse(JSON.stringify(node));
    resolvePropReferences(cloned, propValues);
    shiftSubtree(cloned, Number(instanceNode.x ?? 0), Number(instanceNode.y ?? 0));
    tagInstanceSubtree(cloned, String(instanceNode.id));
    return cloned;
  });

  const bounds = getSubtreeBounds(children);
  return {
    kind: "instance",
    id: String(instanceNode.id),
    x: Number(instanceNode.x ?? bounds?.minX ?? 0),
    y: Number(instanceNode.y ?? bounds?.minY ?? 0),
    w: bounds?.width ?? Number(instanceNode.w ?? 0),
    h: bounds?.height ?? Number(instanceNode.h ?? 0),
    semantic: component.semantic,
    children,
    componentName: component.name,
    componentId: component.id,
    componentProps: component.props || {},
    overrides: instanceNode.overrides || {},
    instanceRootId: String(instanceNode.id),
    isInstanceRoot: true,
  };
}

function resolvePropReferences(value: any, propValues: Record<string, any>, key?: string): any {
  if (typeof value === "string") {
    const m = value.match(/^\$props\.([\w-]+)$/);
    if (!m) return value;
    return propValues[m[1]] ?? "";
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = resolvePropReferences(value[i], propValues);
    return value;
  }
  if (!value || typeof value !== "object") return value;

  for (const [childKey, childValue] of Object.entries(value)) {
    if (childKey === "id" || childKey === "kind" || childKey === "of") continue;
    value[childKey] = resolvePropReferences(childValue, propValues, childKey);
  }
  return value;
}

function shiftSubtree(node: any, dx: number, dy: number) {
  node.x = Number(node.x ?? 0) + dx;
  node.y = Number(node.y ?? 0) + dy;
  for (const child of node.children || []) shiftSubtree(child, dx, dy);
}

function tagInstanceSubtree(node: any, instanceRootId: string) {
  node.instanceRootId = instanceRootId;
  for (const child of node.children || []) tagInstanceSubtree(child, instanceRootId);
}

function getSubtreeBounds(nodes: any[]) {
  if (!nodes.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const visit = (node: any) => {
    const x = Number(node.x ?? 0);
    const y = Number(node.y ?? 0);
    const w = Number(node.w ?? 0);
    const h = Number(node.h ?? 0);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
    for (const child of node.children || []) visit(child);
  };

  for (const node of nodes) visit(node);
  return { minX, minY, width: Math.max(0, maxX - minX), height: Math.max(0, maxY - minY) };
}
