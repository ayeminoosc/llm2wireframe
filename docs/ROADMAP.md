# Product Roadmap: The Interactive WFML Canvas

## Vision
Transform `llm2wireframe` from a static previewer into a fully interactive, Excalidraw-style canvas. The human interacts visually (drag, drop, resize), while the underlying system seamlessly translates these actions back into the semantic WFML text format, allowing an LLM to perfectly understand and co-edit the design in real-time.

## Phase 1: The Interactive Canvas (Drag & Drop)
The goal of this phase is to make the SVG elements selectable and movable, establishing the foundation of the Excalidraw feel.

*   **Interaction State Management:** Introduce a global state in the React viewer to track `selectedNodeId`, `isDragging`, and mouse cursor coordinates.
*   **Draggable Primitives:** Wrap the core SVG rendering functions (`rect`, `text`, `image`) with `onMouseDown`, `onMouseMove`, and `onMouseUp` event handlers.
*   **Visual Feedback:** Add a selection bounding box (a blue outline with resize handles) around the currently active node.
*   **Coordinate Mutation:** When a drag completes, update the internal AST with the new absolute `x` and `y` coordinates.

## Phase 2: The Inverse Layout Solver (The Brains)
This is the hardest and most important phase. We must translate the human's raw mouse movements back into the semantic `place` rules or `flex` structures the LLM relies on.

*   **Dropzone Detection (Flex):** If a node is dropped inside the bounds of a `flex` container, automatically strip its absolute coordinates and append it to the container's `children` array. The Flex engine will automatically snap it into the stack.
*   **Magnetic Snapping (Relative Rules):** Implement a proximity heuristic. As the user drags a node, check the distance to sibling nodes. If the node's top edge is within ~16px of sibling A's bottom edge, snap it and update the AST to `place: below #A by 16`.
*   **Bi-Directional Emitter:** Once the solver updates the AST, run the `emitWFML()` function to regenerate the WFML string and instantly update the text in the left-hand code editor. 

## Phase 3: Canvas Tooling & Extensibility
Fleshing out the Excalidraw experience.

*   **Toolbar & Insertion:** Add a toolbar to the UI allowing the human to select a "Rectangle Tool" or "Text Tool", click the canvas, and instantly insert a new node into the AST.
*   **Property Inspector:** Add a right-hand sidebar panel (like Figma/Excalidraw) where humans can tweak colors, text sizes, and flex gaps visually, instantly updating the underlying WFML code.

## Phase 4: The AI Co-Pilot (LLM Integration)
Connecting the engine to an AI agent to achieve the ultimate goal: human-AI co-creation.

*   **MCP Server / API Route:** Expose the WFML state via a Model Context Protocol (MCP) server or a Next.js API route.
*   **The System Prompt:** Craft the definitive "System Prompt" that teaches the LLM how to speak WFML fluently, including the new `flex` containers and sizing rules (`w: fill`, `h: hug`).
*   **Integrated Chat (Optional):** Build a chat interface directly into the UI where the human can type "Make the login button wider", the LLM streams back a WFML patch, and the UI updates live.