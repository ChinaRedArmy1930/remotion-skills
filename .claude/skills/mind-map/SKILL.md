---
name: mind-map
description: "Create XMind-style mind map animation videos using Remotion. Nodes expand from root to leaves with dynamic centering, typewriter text, and parallelogram-shaped nodes."
---

# Mind Map Animation Skill

Generate XMind-style mind map animation videos from tree-structured JSON data using Remotion.

## Features

- Expand from root to leaves, top-to-bottom within each level
- Dynamic centering: camera smoothly follows visible nodes
- Typewriter text effect on all nodes
- Parallelogram-shaped nodes with configurable themes
- Supports custom JSON data via `--props`

## Quick Start

```bash
cd mind-map
npm install
npm run dev                              # preview with demo data
npm run build:custom                     # render with data.json
npx remotion render src/index.tsx MindMap out/video.mp4 --props=data.json
```

## Data Format

Tree structure with `label` and optional `children`:

```json
{
  "data": {
    "label": "Root Topic",
    "children": [
      {
        "label": "Branch 1",
        "children": [
          { "label": "Leaf 1" },
          { "label": "Leaf 2" }
        ]
      },
      { "label": "Branch 2" }
    ]
  }
}
```

## Key Files

| File | Purpose |
|------|---------|
| `src/index.tsx` | Entry point, Composition registration, data input |
| `src/MindMap.tsx` | Main component, animation timing, dynamic centering |
| `src/layout.ts` | Tree layout algorithm (right-expanding) |
| `src/styles.ts` | Theme config (ThemeConfig interface) |
| `data.json` | Custom data example |

## Customization

### Theme (src/styles.ts)

Edit `ThemeConfig` to change colors, fonts, sizes:

```typescript
export interface ThemeConfig {
  background: string;
  nodeColors: string[];
  nodeBorderColors: string[];
  nodeTextColors: string[];
  rootNodeColor: string;
  rootNodeBorderColor: string;
  rootNodeTextColor: string;
  lineColor: string;
  lineWidth: number;
  fontFamily: string;
  rootFontSize: number;
  nodeFontSize: number;
  nodeShadow: string;
}
```

### Animation Timing (src/MindMap.tsx)

| Constant | Default | Description |
|----------|---------|-------------|
| `FRAMES_PER_DEPTH` | 30 | Gap between depth levels |
| `FRAMES_PER_SIBLING` | 8 | Gap between sibling nodes (top-to-bottom) |
| `FRAMES_PER_CHAR` | 5 | Frames per character (typewriter speed) |
| `LINE_GROW_DURATION` | 25 | Line animation duration in frames |

### Node Shape

Nodes use CSS `skewX(-8deg)` for parallelogram effect. Modify in `MindMap.tsx` Node component.

## Architecture

1. **Layout** (`layout.ts`): Computes x,y positions for all nodes in a tree, expanding rightward from root at (0,0)
2. **Appear Frames** (`MindMap.tsx`): Calculates when each node appears (top-to-bottom within each depth level)
3. **Dynamic Centering**: Pre-computes center-of-mass of visible nodes per frame, applies EMA smoothing (alpha=0.12) for smooth camera movement
4. **Rendering**: SVG bezier curve connections + CSS-positioned node divs, all inside a translated wrapper
