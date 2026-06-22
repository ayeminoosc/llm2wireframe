# llm2wireframe

Excalidraw-style wireframing canvas backed by `WFML` — a text format designed to be readable, editable, and understandable by LLMs.

## What It Is

A visual wireframing tool where users draw like paper and pencil, while every edit is captured as structured `WFML` that an LLM can reason about and co-edit.

**Core idea:** Humans interact visually (drag, draw, resize), the system translates into semantic `WFML`, LLMs edit the code, the UI renders it live. Visual and textual edits stay in sync.

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Studio UI (React)                            │
│  Toolbar  │  Infinite SVG Canvas  │  Property Inspector │ Code Edit │
├─────────────────────────────────────────────────────────────────────┤
│                        Engine Layer                                  │
│  scene  │  layout  │  camera  │  commands  │  registry  │ inference │
├─────────────────────────────────────────────────────────────────────┤
│                    Core Component Library                            │
│  frame  │  rect  │  ellipse  │  arrow  │  text  │  image  │  sticky │
├─────────────────────────────────────────────────────────────────────┤
│                         WFML Core                                    │
│         AST types  │  parser  │  emitter  │  grammar                │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Principles

1. **Visual-first** — studio feels like Excalidraw, no schema forms
2. **WFML is source of truth** — LLMs edit code, humans edit visually, both stay in sync
3. **Complexity in engine** — studio stays thin, all logic lives in engine modules
4. **Semantic inference** — structure is inferred automatically, not manually authored
5. **Extensible** — plugin system for custom node kinds and behaviors

## Current Features

- **Infinite canvas** with pan (middle-click / Hand tool) and zoom (scroll wheel)
- **Draw tools** — Rect, Ellipse, Diamond, Arrow, Line, Freehand, Text, Image, Sticky, Screen (Frame), Flex
- **Excalidraw-style UX** — click tool → drag to create → auto-returns to select
- **Multi-select** — Ctrl+Click toggle, marquee selection, group drag, group delete
- **Hand tool** — canvas panning with grab cursor
- **Eraser tool** — click to erase, drag to erase multiple
- **Lasso selection** — freehand polygon selection
- **Rotation** — rotation handle, live preview, Shift to snap 15°
- **Resize** — 8 handles per node, live preview, batch update for multi-select
- **Arrow endpoints** — circular drag handles for line/arrow endpoints
- **Visual snap guides** — blue dashed alignment lines during drag
- **Property inspector** — grouped swatches, sliders, button groups, number inputs
- **Rect text** — double-click for inline text editing, persists in WFML
- **Arrow features** — arrowheads (6 types), routes (straight/orthogonal/curve), from/to bindings
- **Code editor** — live WFML code panel, bidirectional sync with canvas
- **Undo/Redo** — full document history via `Ctrl+Z` / `Ctrl+Shift+Z`
- **Components** — define reusable components, instantiate with `use` directive
- **Keyboard shortcuts** — V=Select, H=Hand, E=Eraser, L=Lasso, Delete=remove, Escape=cancel

## Running

```bash
npm install
npm run dev    # http://localhost:3002
npm run build
npm test
```

## Project Structure

```
src/
  wfml-core/          # AST type definitions
  parser/             # WFML parser and emitter
  engine/             # Runtime: scene, layout, camera, commands, registry, inference
  core-library/       # Built-in node definitions (primitives)
  studio/             # UI components: toolbar, canvas, panels, hooks
  pages/              # Next.js pages, main viewer
```

## Documentation

- `docs/ARCHITECTURE.md` — detailed architecture design and implementation plan
- `docs/ROADMAP.md` — product roadmap, milestones, future direction
- `docs/WFML.md` — WFML grammar specification
- `docs/FEATURES.md` — feature reference and interaction guide
