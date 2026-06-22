# Product Roadmap

## Vision

Transform llm2wireframe into the definitive tool for human-AI co-creation of wireframes — where humans draw intuitively and LLMs understand, reason about, and co-edit the design through a structured text format (WFML).

## Completed Milestones

### ✅ Phase 1: Interactive Canvas Foundation
- [x] Infinite canvas with SVG rendering
- [x] Camera system (pan, zoom, fit-to-bounds)
- [x] Node selection with visual feedback
- [x] Drag and drop with direct DOM manipulation
- [x] Scene graph mapping (AST → ViewerDoc)
- [x] Layout engine (placement rules, flex containers)
- [x] Node registry system
- [x] Built-in component library (11 primitives)
- [x] Property inspector panel
- [x] Code editor with bidirectional sync
- [x] Undo/Redo document history
- [x] Component system (define, instantiate, override)

### ✅ Phase 2: Draw Tools & Interaction
- [x] Excalidraw-style draw tools (click → drag → create)
- [x] Rect, Ellipse, Diamond, Arrow, Line, Freehand, Text, Image, Sticky, Frame, Flex
- [x] 8-handle resize system with live preview
- [x] Arrow features (arrowheads, routes, from/to bindings)
- [x] Freehand path capture with points array
- [x] Linear endpoint editing (circular handles)
- [x] Inline text editing (double-click textarea)
- [x] Multi-select (Ctrl+Click, marquee, group drag/delete)
- [x] Hand tool (canvas panning)
- [x] Eraser tool (click/drag erase)
- [x] Lasso selection (polygon ray-casting)
- [x] Rotation (handle, live preview, commit, 15° snap)
- [x] Visual snap guides (alignment during drag)
- [x] Keyboard shortcuts (V, H, E, L, Delete, Escape)
- [x] Property inspector redesign (swatches, sliders, button groups)
- [x] Component mode editing (edit nodes inside components)

### ✅ Phase 3: Architecture Hardening
- [x] Engine extraction (scene, layout, camera, commands, registry)
- [x] Core library primitives (render, create, properties, tool)
- [x] Node definition contract
- [x] Parser/emitter with flat-root children model
- [x] AST types in wfml-core
- [x] Semantic inference pass (basic)
- [x] Component expansion (instance → expanded nodes)

## Next Milestones

### Phase 4: Polish & Power Features (Next)
- [ ] Multi-select copy/paste/duplicate (Ctrl+C/V/D)
- [ ] Ctrl+A select all, Ctrl+Shift+A deselect all
- [ ] Distribute align tools (align left/center/right/top/bottom)
- [ ] Group/ungroup with dedicated group node kind
- [ ] Connector routing improvement (midpoint handles, route editing)
- [ ] Arrow from/to binding visual editing (drag endpoints to nodes)
- [ ] Zoom to selection, zoom to fit
- [ ] Canvas minimap
- [ ] Export to PNG/SVG/PDF

### Phase 5: Plugin System
- [ ] Formal registerPlugin() API
- [ ] Plugin runtime in engine
- [ ] Custom node kinds via plugins
- [ ] Custom toolbar tools
- [ ] Custom property inspectors
- [ ] Plugin packs: mobile UI, system diagrams, user flows
- [ ] Plugin marketplace / registry

### Phase 6: Rich Semantic Inference
- [ ] Container membership inference (detect nested structures)
- [ ] Flex/container intent detection from layout patterns
- [ ] Semantic role inference (button, input, card, nav, modal)
- [ ] Connector meaning inference (flow direction, relationship)
- [ ] Auto-normalization after visual edits
- [ ] Semantic export with enriched metadata

### Phase 7: AI Co-Pilot Integration
- [ ] MCP server for WFML state
- [ ] System prompt for WFML fluency
- [ ] Integrated chat panel
- [ ] Natural language edits → WFML patches → live canvas update
- [ ] AI-assisted layout suggestions
- [ ] Component auto-generation from description
- [ ] Design critique and accessibility checking

### Phase 8: Collaboration & Sharing
- [ ] Real-time collaboration (multi-cursor)
- [ ] Shareable links / embeds
- [ ] Version history with branching
- [ ] Import from Figma/Sketch/Excalidraw
- [ ] Export to design specs

## Technology Stack

- **Runtime:** Node.js, Next.js 15
- **UI:** React 18, TypeScript
- **Rendering:** SVG with React refs for performance
- **State:** React useState/useRef, document string as source of truth
- **Build:** Next.js, npm
- **Testing:** Jest (planned)

## Key Metrics

| Metric | Current | Target |
|---|---|---|
| Built-in node kinds | 11 | 20+ (with plugins) |
| Engine commands | 29 | 40+ |
| Draw tools | 11 | 11 (complete) |
| Interaction tools | 5 (select, hand, eraser, lasso, draw) | 8+ |
| Plugin packs | 0 | 3+ |
| Test coverage | 0% | 80%+ |
