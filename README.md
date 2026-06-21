# llm2wireframe

`llm2wireframe` is an Excalidraw-style wireframing canvas backed by `WFML`, a text format designed to be readable, editable, and understandable by LLMs.

Users should be able to sketch naturally, like paper and pencil. The system should translate those visual edits into a structured `WFML` document that preserves layout, hierarchy, and semantic meaning well enough for an LLM to reason about and co-edit the design.

## Product Direction

- Visual-first studio for normal users
- `WFML` as the source of truth
- Infinite canvas interaction model
- Semantic export that is more useful to LLMs than raw drawing JSON
- Extensible architecture with core components and plugins

## Core Principles

1. The studio must stay intuitive.
2. `WFML` can be richer than the visible UI.
3. Complexity belongs in the engine, not in the user workflow.
4. Semantic structure should be inferred when possible.
5. Plugins should extend the system without fragmenting the language.

## Architecture Overview

The intended architecture is split into five layers:

1. `WFML core`
2. `engine`
3. `core component library`
4. `plugin system`
5. `studio UI`

See `docs/ARCHITECTURE.md` for the detailed design and implementation plan.

## Current State

The repository is currently an early prototype.

- `src/parser/wfml-grammar-parser-emitter.ts` contains the current `WFML` parser and emitter
- `src/pages/wfml_react_viewer.tsx` currently mixes viewer UI, interaction handling, layout, and document mutation
- the viewer is being moved toward a single infinite SVG canvas
- some docs and tests still reflect the older page-based model and need to be updated

## Running Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3002`.

## Useful Commands

```bash
npm run dev
npm run build
npm run test
```

## Near-Term Priorities

1. Align tests and docs with the flat root `children` model.
2. Extract engine logic out of `wfml_react_viewer.tsx`.
3. Introduce a registry for built-in node definitions.
4. Establish the boundary between `WFML core`, engine, and plugins.
5. Add semantic inference without making the studio harder to use.
