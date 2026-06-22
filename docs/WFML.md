# WFML Grammar Specification

Wireframe Markup Language (WFML) — a text format for structured, LLM-readable wireframe documents.

## Document Structure

```
WFML Document
├── meta:                # optional document metadata
├── assets:              # optional asset definitions (images, fonts, icon packs)
├── components:          # optional reusable component definitions
└── (root nodes)         # canvas elements at document root
```

## Quick Example

```
meta:
  version: 0.1
  author: designer

frame phone:
  w: 390
  h: 844
  corner: 12
  fill: #F5F6FA

  text title:
    text: "Welcome"
    size: 24
    place: centered in #phone

  rect button:
    w: 200
    h: 44
    corner: 10
    fill: #2B59FF
    text: "Get Started"
    place: centered in #phone
```

## Syntax Rules

### Nodes

A node is declared as: `kind id:`

```
rect card:
  x: 100
  y: 100
  w: 200
  h: 100
```

The `id` is a unique identifier. Optional `name` property provides a display label.

### Properties

Properties are key-value pairs indented under the node:

```
rect card:
  x: 100
  y: 100
  w: 200
  h: 100
  rotation: 45
  opacity: 80
```

Properties can be nested with dot notation:

```
text label:
  text: "Hello"
  style.text.size: 24
  style.text.color: #0f172a
```

Or using a `style:` section:

```
rect card:
  style:
    fill: #ffffff
    stroke: #1f2937
    strokeWidth: 2
    corner: 8
```

### Values

| Type | Example |
|---|---|
| Number | `100`, `-10`, `3.14` |
| String (quoted) | `"Hello"`, `'World'` |
| String (unquoted) | `center`, `solid` |
| Boolean | `true`, `false` |
| Color (hex) | `#ff0000`, `#F5F6FA` |
| Size | `200`, `fill`, `hug`, `auto` |
| List | `[10, 20, 30]` |
| Object | `{ blur: 4, x: 2, y: 2 }` |

### Comments

```
# Single line comment
```

## Node Kinds

### Primitives

| Kind | Description | Required Props |
|---|---|---|
| `rect` | Rectangle | none |
| `ellipse` | Ellipse/Circle | none |
| `diamond` | Diamond shape | none |
| `text` | Free-standing text | `text` |
| `image` | Image | `src` |
| `sticky` | Sticky note | none |
| `line` | Line segment | none |
| `arrow` | Arrow connector | none |
| `polyline` | Multi-segment line | `points` |
| `freehand` | Free-drawn path | `points` |

### Containers

| Kind | Description | Required Props |
|---|---|---|
| `frame` | Screen/container with children | none |
| `flex` | Flex layout container | none |
| `group` | Logical group with children | none |

### Components

```
components:
  component PrimaryButton:
    rect btn-base:
      w: fill
      h: 44
      corner: 10
      fill: #2B59FF

    text btn-label:
      text: "{label}"
      size: 14
      place: centered in #btn-base

# Usage:
use PrimaryButton submit:
  label: "Submit"
  w: 200
  h: 44
```

### Assets

```
assets:
  - id: @logo
    kind: image
    src: https://example.com/logo.png

  - id: @inter
    kind: font
    src: https://fonts.googleapis.com/css2?family=Inter
```

## Node Properties

### Geometry

| Property | Type | Default | Description |
|---|---|---|---|
| `x` | number | 0 | X position |
| `y` | number | 0 | Y position |
| `w` | number / "fill" / "hug" / "auto" | auto | Width |
| `h` | number / "fill" / "hug" / "auto" | auto | Height |
| `rotation` | number | 0 | Rotation in degrees |

### Visibility & State

| Property | Type | Default | Description |
|---|---|---|---|
| `opacity` | number (0-100) | 100 | Opacity percentage |
| `z` | number | auto | Z-index stacking order |
| `lock` | boolean | false | Lock node from editing |
| `hidden` | boolean | false | Hide node |
| `tags` | string[] | [] | Tag array for categorization |

### Style

| Property | Type | Default | Description |
|---|---|---|---|
| `style.fill` | string / color | none | Fill color |
| `style.stroke` | string / color | #1f2937 | Stroke color |
| `style.strokeWidth` | number | 1 | Stroke width in px |
| `style.strokeStyle` | solid / dashed / dotted | solid | Stroke style |
| `style.corner` | number | 8 | Corner radius |
| `style.edges` | sharp / round | auto | Edge style |
| `style.roughness` | number (0-3) | 0 | Sketch roughness |
| `style.sketch` | boolean | false | Enable sketch mode |
| `style.seed` | number | random | Random seed for sketch |
| `style.shadow` | object | none | Shadow config |

### Text Style

| Property | Type | Default | Description |
|---|---|---|---|
| `style.text.font` | string | Inter, sans-serif | Font family |
| `style.text.size` | number | 14 | Font size |
| `style.text.weight` | number | 400 | Font weight |
| `style.text.color` | color | #0f172a | Text color |
| `style.text.align` | left / center / right | center | Text alignment |
| `style.text.opacity` | number (0-100) | 100 | Text opacity |
| `style.text.wrap` | boolean | false | Enable text wrapping |
| `style.text.autoSize` | boolean | false | Auto-size to content |

### Arrow-Specific

| Property | Type | Values | Description |
|---|---|---|---|
| `startHead` | string | none, arrow, triangle, circle, diamond, bar | Start arrowhead |
| `endHead` | string | none, arrow, triangle, circle, diamond, bar | End arrowhead |
| `route` | string | straight, orthogonal, curve | Routing style |
| `from` | string | `#nodeId.anchor` | From node binding |
| `to` | string | `#nodeId.anchor` | To node binding |
| `points` | [number,number][] | | Custom point array |

### Image-Specific

| Property | Type | Values | Description |
|---|---|---|---|
| `src` | string | URL or @assetRef | Image source |
| `fit` | string | cover, contain, stretch | Fit mode |

### Flex-Specific

| Property | Type | Values | Default | Description |
|---|---|---|---|---|
| `direction` | string | column, row | column | Flex direction |
| `gap` | number | | 0 | Child gap spacing |
| `padding` | number | | 0 | Container padding |

### Semantic Metadata

```
text label:
  text: "Submit"
  semantic:
    role: button
    inferred: false
```

| Property | Type | Description |
|---|---|---|
| `semantic.role` | string | Semantic role (button, input, card, etc.) |
| `semantic.inferred` | boolean | Whether role was auto-inferred |
| `semantic.confidence` | number (0-1) | Inference confidence score |

## Placement Rules

The `place` property defines relative positioning:

```
text title:
  text: "Hello"
  place: centered in #frame1

rect sidebar:
  w: 200
  h: 400
  place: leftOf #main by 16
```

| Rule | Syntax | Description |
|---|---|---|
| `centered` | `centered in #ref` | Center inside reference |
| `centerX` | `centerX in #ref` | Center horizontally |
| `centerY` | `centerY in #ref` | Center vertically |
| `below` | `below #ref by N` | Below reference with gap |
| `above` | `above #ref by N` | Above reference with gap |
| `rightOf` | `rightOf #ref by N` | Right of reference |
| `leftOf` | `leftOf #ref by N` | Left of reference |
| `inside` | `inside #ref inset N` | Inside with inset |
| `alignLeft` | `alignLeft with #ref` | Align left edge |
| `alignRight` | `alignRight with #ref` | Align right edge |
| `alignTop` | `alignTop with #ref` | Align top edge |
| `alignBottom` | `alignBottom with #ref` | Align bottom edge |

## Anchor Points

For connectors, anchor points are: `center`, `top`, `bottom`, `left`, `right`, `auto`.

```
arrow connection:
  from: #button1.right
  to: #card1.left
  endHead: arrow
  route: orthogonal
```

## Parser & Emitter

- **Parser:** Parses WFML text → AST (located in `src/parser/wfml-grammar-parser-emitter.ts`)
- **Emitter:** Emits AST → canonical WFML text
- Round-trip: parse → modify AST → emit produces valid WFML
- Parser is lenient with indentation, supports both spaces and tabs
- Emitter normalizes to consistent formatting
