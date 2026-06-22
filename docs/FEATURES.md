# Feature Reference

## Tools

### Selection & Navigation

| Tool | Shortcut | Description |
|---|---|---|
| **Select** | `V` | Click to select, drag to marquee select |
| **Hand** | `H` | Drag to pan canvas |
| **Eraser** | `E` | Click to erase, drag to erase multiple |
| **Lasso** | `L` | Draw freehand polygon to select enclosed nodes |

### Draw Tools

| Tool | Icon | Creates | Notes |
|---|---|---|---|
| **Screen** | 📱 | `frame` | 390×844 default (phone size) |
| **Rect** | ▱ | `rect` | 100×100 default, supports text |
| **Ellipse** | ◯ | `ellipse` | 100×100 default |
| **Diamond** | ◇ | `diamond` | 100×100 default |
| **Arrow** | → | `arrow` | With arrowhead, configurable route |
| **Line** | ╱ | `line` | Straight line segment |
| **Freedraw** | ✏ | `freehand` | Captures raw pointer path |
| **Text** | T | `text` | Free-standing text node |
| **Image** | 🖼 | `image` | Placeholder image |
| **Sticky** | 📝 | `sticky` | Yellow sticky note |
| **Flex** | ◫ | `flex` | Flex layout container |

All draw tools follow Excalidraw-style interaction: click tool → cursor changes to crosshair → drag on canvas → shape created → auto-returns to select tool.

## Interactions

### Node Selection

| Action | Result |
|---|---|
| Click node | Select single node |
| Ctrl/Cmd + Click | Toggle multi-select |
| Drag on empty canvas | Marquee selection box |
| Double-click rect | Enter inline text edit mode |

### Node Manipulation

| Action | Result |
|---|---|
| Drag node | Move node (and selected siblings) |
| Drag resize handle | Resize node (8 handles: corners + edges) |
| Drag rotation handle | Rotate node (blue line + circle at top of selection) |
| Drag resize + Shift | Constrain proportion |
| Drag rotation + Shift | Snap to 15° increments |

### Canvas Navigation

| Action | Result |
|---|---|
| Scroll wheel | Zoom in/out at cursor position |
| Middle-click drag | Pan canvas |
| Hand tool + drag | Pan canvas |

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `V` | Select tool |
| `H` | Hand tool |
| `E` | Eraser tool |
| `L` | Lasso tool |
| `Delete` / `Backspace` | Delete selected nodes |
| `Escape` | Cancel current action / deselect |
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo |
| `Ctrl+E` / `Cmd+E` | Toggle code editor |
| `Ctrl+A` | Select all (pending) |
| `Ctrl+C` | Copy selected (pending) |
| `Ctrl+V` | Paste (pending) |
| `Ctrl+D` | Duplicate selected (pending) |

### Snap Guides

When dragging a node, blue dashed lines appear when edges or centers align within 5px threshold:
- **Vertical guides:** left/right edge alignment, center X alignment
- **Horizontal guides:** top/bottom edge alignment, center Y alignment

### Selection Visual

When a node is selected:
- Blue outline (`#3b82f6`) with 2px stroke
- 8 resize handles (10×10 rects, white fill, blue stroke)
- Rotation handle (blue line + circle at top edge center)
- All handles rotate with the node when rotation is applied

## Property Inspector

Right-side panel shows properties for selected node, grouped by category.

### Property Types

| Type | UI | Example |
|---|---|---|
| `color` | Color swatch row | Stroke color, fill color |
| `buttonGroup` | Segmented buttons | Stroke width, stroke style, edges |
| `slider` | Range slider | Opacity (0-100) |
| `number` | Number input | Width, height, rotation, font size |
| `select` | Dropdown | Font family, route, arrowhead |
| `text` | Text input | Node text content |

### Property Groups (by node kind)

**Rect:**
- Stroke (swatches: Ink, Red, Green, Blue, Orange, Gray)
- Background (swatches: None, Rose, Green, Blue, Yellow, Gray)
- Stroke width (Thin, Medium, Bold)
- Stroke style (Solid, Dashed, Dotted)
- Sloppiness (Clean, Loose, Sketchy)
- Edges (Sharp, Round)
- Opacity (slider)
- Rotation (number)
- Text content (text input)
- Text stroke, font family, font size, text align, text opacity
- Semantic role

**Arrow:**
- Size (Span X, Span Y)
- Stroke, stroke width, stroke style, sloppiness, opacity
- Arrowheads (start cap, end cap): None, Arrow, Triangle, Circle, Diamond, Bar
- Route: Straight, Orthogonal, Curve
- Semantic role

**Text:**
- Content (text input)
- Color, Size, Font, Align
- Opacity
- Semantic role

**Flex:**
- Layout: Gap, Padding, Direction (Column/Row)
- Size: Width, Height
- Stroke, Background, Stroke width, Stroke style, Sloppiness, Opacity
- Semantic role

## Component System

### Defining Components

Components are defined in the WFML code under `components:` section:

```
components:
  component Card:
    rect card-bg:
      w: fill
      h: 100
      corner: 8
      fill: #ffffff

    text card-title:
      text: "{title}"
      size: 16
```

Props are defined with `{propName}` placeholders in node properties.

### Using Components

```
use Card user-card:
  title: "John Doe"
  w: 300
  h: 120
  x: 100
  y: 100
```

### Editing Components

When editing a node inside a component instance:
- Toolbar shows component edit mode indicator
- Changes commit to the component definition (not the instance)
- All instances update

## Canvas Architecture

### Rendering Pipeline

```
WFML string → parse → AST → mapDoc → ViewerDoc → layoutDoc → render
```

1. **Parse:** WFML text → AST via grammar parser
2. **Map:** AST → ViewerDoc (flat scene graph) via `mapDoc()`
3. **Layout:** Resolve placement rules, flex containers, sizing via `layoutDoc()`
4. **Render:** Registry routes each node kind to its render function → SVG elements

### Performance

- **Direct DOM refs:** Drag/resize use `setAttribute("transform")` on SVG refs, not React re-renders
- **Separate ref pools:** `nodeRefs` for drag transforms, `rotatedGroupRefs` for rotation transforms
- **SVG filters:** Sketch/roughness uses SVG `<filter>` with `feDisplacementMap`
- **Batch updates:** Multi-select drag moves all selected nodes in single frame

### Camera System

Camera applies `translate(x, y) scale(z)` via SVG `<g transform>` wrapper.

- **Pan:** Middle-click drag, Hand tool
- **Zoom:** Scroll wheel (zooms at cursor position)
- **Fit to bounds:** Calculates optimal zoom to fit all content
- **Default:** x=0, y=0, z=1
