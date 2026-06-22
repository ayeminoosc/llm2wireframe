# Architecture: Interactive WFML Canvas

## Overview

Excalidraw-style canvas where users draw visually, backed by `WFML` (Wireframe Markup Language) as the canonical representation.

Two conflicting needs:
1. Normal users draw intuitively with zero training
2. Underlying representation is structured enough for LLMs to understand, edit, regenerate

Architecture keeps studio simple, moves semantic complexity into engine.

## Product Principles

1. Visual interaction is primary
2. WFML is the source of truth
3. Studio stays lightweight, not schema-heavy
4. Semantic richness is mostly inferred, not manually entered
5. Language stays stable as components expand
6. Plugins extend without forking WFML meaning

## Layer Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    Studio UI (React/Next.js)                     │
│                                                                  │
│  ┌─────────┐  ┌──────────────────────┐  ┌──────────┐ ┌────────┐ │
│  │ Toolbar │  │  Infinite SVG Canvas │  │ Property │ │ Code   │ │
│  │ (tools) │  │  + camera transform  │  │ Inspector│ │ Editor │ │
│  └─────────┘  └──────────────────────┘  └──────────┘ └────────┘ │
├──────────────────────────────────────────────────────────────────┤
│                         Engine Layer                             │
│                                                                  │
│  scene.ts    → AST-to-scene mapping, ViewerDoc/ViewerNode        │
│  layout.ts   → placement rules, flex containers, sizing          │
│  camera.ts   → pan/zoom math, fit-to-bounds                      │
│  commands.ts → undoable AST mutations (29 command functions)     │
│  registry.ts → node definition registry, tool definitions        │
│  inference.ts → semantic role inference                          │
│  components.ts → component expansion, prop resolution            │
├──────────────────────────────────────────────────────────────────┤
│                  Core Component Library                           │
│                                                                  │
│  primitives.tsx → 11 built-in node definitions                   │
│  frame, rect, flex, ellipse, diamond, arrow, line,               │
│  freehand, text, image, sticky                                   │
├──────────────────────────────────────────────────────────────────┤
│                         WFML Core                                │
│                                                                  │
│  ast.ts → Document, Node, Style, PlacementRule types             │
│  parser/emitter → parse WFML text ↔ AST, emit AST → WFML text   │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User draws on canvas
    │
    ▼
React state (selectedId, camera, document string)
    │
    ▼
Engine commands (updateNodePropertyInSource, insertRootNodeIntoSource)
    │
    ▼
Parse WFML → AST → modify → emit WFML → new document string
    │
    ▼
Engine scene (mapDoc: AST → ViewerDoc)
    │
    ▼
Engine layout (layoutDoc: resolve placement, flex, sizing)
    │
    ▼
React render (registry.render → SVG elements)
```

## Current Implementation Status

### ✅ Implemented

| Module | Status | Notes |
|---|---|---|
| WFML Core (AST types) | ✅ Done | `src/wfml-core/ast.ts` |
| Parser + Emitter | ✅ Done | `src/parser/wfml-grammar-parser-emitter.ts` |
| Engine: scene | ✅ Done | `src/engine/scene.ts` — mapDoc, findNodeById, getSceneBounds |
| Engine: layout | ✅ Done | `src/engine/layout.ts` — place rules, flex containers |
| Engine: camera | ✅ Done | `src/engine/camera.ts` — pan, zoom, fit-to-bounds |
| Engine: commands | ✅ Done | `src/engine/commands.ts` — 29 mutation functions |
| Engine: registry | ✅ Done | `src/engine/registry.ts` — NodeDefinition, createNodeRegistry |
| Engine: inference | ✅ Partial | `src/engine/inference.ts` — basic semantic role preservation |
| Engine: components | ✅ Done | `src/engine/components.ts` — expandComponentInstance |
| Core Library | ✅ Done | 11 primitives with render, create, properties |
| Studio: toolbar | ✅ Done | Tool definitions from registry |
| Studio: canvas | ✅ Done | Infinite SVG with camera transform |
| Studio: property inspector | ✅ Done | Grouped properties, swatches, sliders |
| Studio: code editor | ✅ Done | Bidirectional WFML sync |
| Studio: node wrapper | ✅ Done | Selection, drag, resize handles, overlay |

### 🔄 In Progress / Planned

| Module | Status | Notes |
|---|---|---|
| Plugin system | Planned | Formal registerPlugin() API |
| Semantic inference | Partial | Basic, needs rich heuristics |
| Test suite | Planned | Jest tests for engine modules |
| Multi-select copy | Planned | Ctrl+C / Ctrl+V / Ctrl+D |
| Plugin packs | Planned | Mobile UI, system diagrams, user flows |

## Document Model

### WFML Structure

```
WFML Document
├── meta: { version, author, seed }
├── assets: Asset[]          # images, fonts, icon packs
├── components: Component[]  # reusable component definitions
└── children: Node[]         # root-level canvas nodes
```

### Node Contract

Every node has:
- `id` — unique identifier
- `kind` — node type (rect, text, arrow, etc.)
- `x`, `y`, `w`, `h` — geometry (supports "fill", "hug", "auto" for sizing)
- `rotation` — degrees
- `opacity` — 0-100
- `z` — z-index
- `lock`, `hidden` — state flags
- `style` — fill, stroke, strokeWidth, strokeStyle, corner, edges, roughness, text
- `place` — relative placement rules
- `semantic` — role, inferred flag, confidence
- `children` — nested nodes

### Canvas Coordinate System

- Infinite 2D canvas, origin at (0, 0)
- Camera applies `translate(x, y) scale(z)` via SVG transform
- Nodes use absolute coordinates; flex containers reposition children
- `place` rules resolve at layout time

## Key Design Decisions

### SVG Over Canvas
Structural DOM benefits outweigh raw performance for <2000 element wireframes. Each node is an interactive SVG element with event handlers.

### WFML Source of Truth
Document state is a string. Engine commands parse → modify → emit → new string. Undo/redo always round-trips through parse/emit.

### Direct DOM Manipulation for Performance
Drag and resize use `setAttribute("transform")` on refs for frame-by-frame updates, avoiding React re-renders per pixel.

### Registry-Driven Rendering
Node definitions (create, render, properties, tool) registered in `primitives.tsx`. Viewer routes rendering through registry. Adding new node kind = one registration.

### Excalidraw-Style UX
- Tool activates on click, cursor changes, drag creates shape, auto-returns to select
- No schema forms, no modal dialogs for creation
- Property inspector for refinement after creation

## Why Excalidraw JSON Isn't Enough

Excalidraw data is geometry-first — preserves how something looks, not what it means. WFML preserves:
- Visual structure + hierarchy
- Reusable components with props
- Layout intent (flex containers, placement rules)
- Semantic hints useful to LLMs
- Relationships (connectors, bindings)

## Risks

| Risk | Mitigation |
|---|---|
| Viewer page owns too much engine logic | Extract engine modules, thin shell viewer |
| Over-designing plugin system too early | Start with minimal registry, one extension path |
| Making semantic authoring visible | Keep inference internal, user overrides win |
| Uncontrolled plugin vocabularies | Shared core ontology, naming guidance |
| Stale docs drifting from code | Update tests and docs with code changes |
