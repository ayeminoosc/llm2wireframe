# Architecture Design: Interactive WFML Canvas

## Overview

This project is building an Excalidraw-style canvas where users draw visually, while the canonical representation is a text language called `WFML`.

The core product challenge is balancing two needs that often conflict:

1. normal users must be able to draw intuitively with little or no training
2. the underlying representation must be structured enough for an LLM to understand, edit, and regenerate faithfully

The architecture should therefore keep the studio simple while moving semantic and structural complexity into the engine.

## Product Principles

1. Visual interaction is primary.
2. `WFML` is the source of truth.
3. The studio should feel lightweight, not schema-heavy.
4. Semantic richness should be mostly inferred, not manually entered.
5. The language must stay stable even as components and behaviors expand.
6. Plugins must extend the system without forking the meaning of `WFML`.

## Current Codebase Read

The current prototype has useful foundations but several concerns are still fused.

### Existing strengths

- `WFML` parser and emitter already exist
- the AST supports dynamic node kinds and arbitrary properties
- the viewer now has a unified canvas direction
- layout and placement rules already exist in early form

### Current architectural problems

- parser, layout, scene mapping, rendering, interaction, and mutation are not cleanly separated
- the main viewer page currently acts as both UI and engine
- tests and docs still partially assume the older page-based model
- there is no explicit component registry or plugin runtime yet
- semantic inference has no formal place in the architecture

## Target Architecture

The system should be split into five layers.

### 1. WFML Core

Responsibility:
- grammar
- AST types
- parser
- emitter
- validation
- normalization
- version migration

This layer defines the language contract.

It should not know about:
- React
- canvas interaction
- pointer events
- layout runtime
- plugin UI

Suggested responsibilities by module:

| Module | Responsibility |
|---|---|
| `ast` | canonical document and node types |
| `parser` | parse `WFML` text into AST |
| `emitter` | emit canonical `WFML` from AST |
| `validate` | structural and semantic validation |
| `normalize` | canonical defaults and cleanup |
| `migrate` | schema/version upgrades |

### 2. Engine

Responsibility:
- scene graph construction
- layout solving
- camera transforms
- selection and hit testing
- drag, move, resize, group, and reorder commands
- snapping
- semantic inference
- plugin registration/runtime
- canonical AST mutation operations

This layer is where complexity should live.

The engine should expose reusable operations so the studio UI stays thin.

Suggested responsibilities by module:

| Module | Responsibility |
|---|---|
| `scene` | map AST into renderable scene data |
| `layout` | resolve sizing, placement, stacking, and constraints |
| `camera` | pan/zoom transform math |
| `selection` | hit testing and selection state helpers |
| `commands` | user actions as undoable mutations |
| `mutations` | low-level AST edits |
| `snap` | proximity rules and smart alignment |
| `inference` | infer semantic roles and structural relationships |
| `registry` | node and plugin registration |

### 3. Core Component Library

Responsibility:
- built-in primitives
- built-in semantic components
- default creation templates
- default rendering contracts
- default property metadata

This is the built-in catalog, not the language itself.

Primitive examples:
- `frame`
- `rect`
- `ellipse`
- `diamond`
- `text`
- `line`
- `arrow`
- `image`
- `sticky`
- `group`
- `flex`

Semantic examples for later:
- `screen`
- `button`
- `input`
- `card`
- `modal`
- `nav`
- `list`
- `annotation`

Important rule:
users may draw primitives, while the engine may enrich the underlying `WFML` with stronger semantic meaning.

### 4. Plugin System

Responsibility:
- custom node kinds
- custom renderers
- custom layout behavior
- custom inspectors
- custom inference rules
- domain-specific component packs

Example plugin packs:
- mobile UI
- system diagrams
- user flows
- whiteboarding annotations
- domain-specific component packs

Plugins should extend the system through the engine registry rather than changing the grammar every time a new component appears.

### 5. Studio UI

Responsibility:
- toolbar
- canvas shell
- code editor panel
- property panel
- optional copilot/chat UI

The studio should call engine APIs rather than owning layout or mutation logic directly.

## Data Model Direction

The current root `children` model is the right direction for the infinite canvas.

Recommended canonical document shape:

- `meta`
- `assets`
- `components`
- `children`

Each node should keep a stable base contract:

- `id`
- `kind`
- `children`
- geometry fields
- style fields
- placement/constraint fields
- optional semantic metadata
- optional plugin metadata

## Semantic Strategy

The studio should not force users to fill forms or think in schemas.

Instead:

### Users explicitly control

- shapes
- arrows/connectors
- text labels
- grouping
- rough layout
- simple style choices

### Engine should infer when possible

- container membership
- stack/flex intent
- relative placement rules
- likely semantic role
- likely connector meaning
- canonical `WFML` normalization

### User input should override inference

If the user provides explicit text or a direct edit, that should win over heuristics.

## Why Excalidraw JSON Is Not Enough

Excalidraw-style data is mostly geometry-first. It preserves how something looks, but not reliably what it means.

`WFML` must preserve:

- visual structure
- hierarchy
- reusable components
- layout intent
- relationships
- semantic hints useful to an LLM

The goal is not to make users author semantics manually. The goal is to make the engine produce better semantics automatically.

## Minimal Plugin Contract

The plugin system should start with a small contract.

Suggested node definition shape:

| Field | Purpose |
|---|---|
| `kind` | stable node kind name |
| `label` | UI-facing display name |
| `category` | toolbar grouping |
| `defaults` | initial node properties |
| `render` | SVG/scene rendering behavior |
| `measure` | bounds and intrinsic sizing |
| `layoutBehavior` | optional layout rules |
| `inspectorSchema` | property editor metadata |
| `serialize` | optional custom emit behavior |
| `infer` | optional semantic enrichment hook |

Suggested plugin package shape:

- one or more node definitions
- optional toolbar tools
- optional import/export adapters
- optional inference rules
- optional styling tokens

## Recommended Folder Structure

This can live under `src/` first and be split into packages later if needed.

```text
src/
  wfml-core/
    ast.ts
    parser.ts
    emitter.ts
    validate.ts
    normalize.ts
    migrate.ts
  engine/
    scene.ts
    layout.ts
    camera.ts
    selection.ts
    commands.ts
    mutations.ts
    snap.ts
    inference.ts
    registry.ts
  core-library/
    primitives.ts
    ui-components.ts
    diagram-components.ts
  studio/
    components/
    panels/
    hooks/
  pages/
    index.tsx
    wfml_react_viewer.tsx
  plugins/
    mobile-ui/
    system-diagram/
    user-flow/
```

## Immediate Gaps In The Repo

1. `README.md` was generic and did not describe the actual product
2. `wfml.spec.ts` still assumes `page -> frame`
3. `docs/grammar.txt` and `docs/compile.ts` still describe the old model
4. `src/pages/wfml_react_viewer.tsx` still contains engine logic
5. there is no registry for built-in node definitions
6. there is no plugin API
7. there is no formal place for semantic inference

## Phased Implementation Plan

### Phase 1: Consistency And Foundation

Goal:
align code, tests, and docs to the current flat-root direction.

Tasks:
- update tests to use root `children`
- update grammar docs and examples
- extract AST types from the parser file
- keep `WFML` core small and explicit

Gate:
- parser, emitter, tests, and docs all describe the same document model

### Phase 2: Engine Extraction

Goal:
move non-UI behavior out of `wfml_react_viewer.tsx`.

Tasks:
- extract AST-to-scene mapping
- extract layout solving
- extract camera math
- extract mutation and drag commit logic
- leave the page as a thin shell over engine APIs

Gate:
- the viewer page no longer owns layout and document mutation internals

### Phase 3: Node Registry And Core Library

Goal:
replace hardcoded branching with a registered built-in library.

Tasks:
- define node definition types
- register primitive nodes
- move insertion defaults into the core library
- route rendering and creation through the registry

Gate:
- built-in nodes are registered, not hardcoded in the page component

### Phase 4: Semantic Enrichment

Goal:
make `WFML` more useful to LLMs without complicating the UX.

Tasks:
- define optional semantic metadata
- add inference passes after user edits
- infer container/layout relationships and likely roles
- preserve explicit user-authored meaning over inference

Gate:
- exported `WFML` contains richer structure while the studio interaction model stays simple

### Phase 5: Plugin Runtime

Goal:
let developers extend the system safely.

Tasks:
- define plugin registration
- support custom kinds and behaviors
- support custom inspectors and inference rules
- create first example plugin packs

Gate:
- external node types can be added without changing core grammar code

### Phase 6: Inverse Solver And Smart Canvas Behavior

Goal:
turn intuitive freeform drawing into structured `WFML`.

Tasks:
- flex/container dropzone detection
- relative placement snapping
- auto-attachment/grouping heuristics
- connector meaning inference
- normalized emission after edits

Gate:
- visual edits produce better semantic `WFML` automatically

## First Milestone Recommendation

Do not start with the plugin system.

The first milestone should be:

1. fix model and docs consistency
2. extract the engine from the viewer page
3. add a built-in node registry for primitives

This keeps the next step small while creating the foundation for everything after it.

## File-By-File Near-Term Plan

1. update `wfml.spec.ts` to the flat root model
2. update `docs/grammar.txt` and `docs/compile.ts`
3. split AST types out of `src/parser/wfml-grammar-parser-emitter.ts`
4. create `src/engine/scene.ts`
5. create `src/engine/layout.ts`
6. create `src/engine/commands.ts`
7. create `src/engine/registry.ts`
8. create `src/core-library/primitives.ts`
9. simplify `src/pages/wfml_react_viewer.tsx` to consume the engine and registry

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| keeping logic inside the page component for too long | slows all future work | extract engine modules early |
| over-designing the plugin system too early | wasted effort | start with a minimal registry and one example extension path |
| making semantic authoring visible to end users | harms usability | keep inference mostly internal |
| allowing uncontrolled plugin vocabularies | reduces LLM consistency | maintain a shared core ontology and naming guidance |
| stale docs/specs drifting from implementation | causes confusion | update tests and docs in the same phase as code changes |

## Decision Summary

The right direction is:

- `WFML` as grammar and source of truth
- engine as the main runtime brain
- core library as the built-in component catalog
- plugins as the extensibility model
- studio UI as a thin, intuitive visual shell

That architecture best matches the product requirement of a simple Excalidraw-like experience backed by an LLM-friendly semantic representation.
