import type { ReactNode } from "react";
import type { ViewerNode } from "./scene";

export type NodeFactory = (id: string, x: number, y: number) => any;

export type NodePropertyDefinition = {
  key: string;
  label: string;
  type: "text" | "number" | "color" | "select" | "buttonGroup" | "slider";
  group?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string; swatch?: string; icon?: string }[];
};

export type NodeToolDefinition = {
  label: string;
  icon: string;
  separatorBefore?: boolean;
};

export type NodeRenderArgs = {
  node: ViewerNode;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  corner: number;
  renderChildren: () => ReactNode;
};

export type NodeDefinition = {
  kind: string;
  create: NodeFactory;
  tool?: NodeToolDefinition;
  properties?: NodePropertyDefinition[];
  render?: (args: NodeRenderArgs) => ReactNode;
};

export type NodeRegistry = Map<string, NodeDefinition>;

export function createNodeRegistry(definitions: NodeDefinition[]): NodeRegistry {
  return new Map(definitions.map((def) => [def.kind, def]));
}

export function createNodeFromRegistry(registry: NodeRegistry, kind: string, id: string, x: number, y: number) {
  const definition = registry.get(kind);
  if (!definition) return { kind, id, x, y };
  return definition.create(id, x, y);
}

export function getToolDefinitions(registry: NodeRegistry): NodeDefinition[] {
  return Array.from(registry.values()).filter((definition) => Boolean(definition.tool));
}
