# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Remotion animation skills — a collection of standalone Remotion video projects, each usable as a Claude Code skill. Each skill directory is an independent Remotion project with its own `package.json`, `remotion.config.ts`, and `tsconfig.json`. There is no root-level package.json or workspace configuration.

## Commands

All commands run from within a skill directory (e.g., `cd mind-map`):

```bash
npm install            # Install dependencies
npm run dev            # Open Remotion Studio for live preview
npm run build          # Render video with demo/default data
npm run build:custom   # Render with custom data.json (where available)
```

Render with arbitrary data:
```bash
npx remotion render src/index.tsx <ComponentName> out/video.mp4 --props=data.json
```

## Architecture

### Skill Structure Pattern

Each skill follows this file organization:

- `src/index.tsx` — Entry point, registers the Remotion `Composition` with dimensions/fps/duration, reads `--props` input
- `src/<MainComponent>.tsx` — Core animation component using `useCurrentFrame()` for frame-based animation
- `src/layout.ts` — Layout algorithm (tree/node positioning)
- `src/timing.ts` — Animation timing calculations (when elements appear, transition durations)
- `src/styles.ts` — Theme configuration (colors, fonts, sizes as typed interfaces)
- `src/types.ts` — TypeScript interfaces for data structures
- `data.json` — Demo/custom data file

### Key Patterns

- **Frame-based animation**: All animations driven by `useCurrentFrame()` from Remotion, not CSS transitions
- **Data-driven rendering**: Content comes from JSON passed via `--props`, not hardcoded
- **SVG + CSS hybrid**: Connections drawn with SVG (bezier curves), nodes positioned with CSS
- **Dynamic camera**: Center-of-mass calculation with exponential moving average smoothing for smooth panning
- **Remotion config**: Each project uses JPEG image format, swiftshader GL renderer, and overwrite output

### Current Skills

- **mind-map** — XMind-style mind map with right-expanding tree layout, typewriter text, parallelogram nodes, dynamic centering
- **chapter-progress** — Icicle chart timeline visualization with hierarchical time blocks

## Adding a New Skill

1. Create a new directory at the project root
2. Set up `package.json` with `remotion`, `@remotion/cli`, `react`, `react-dom` dependencies
3. Create `remotion.config.ts` (copy from existing skill)
4. Create `tsconfig.json` (copy from existing skill)
5. Follow the file structure pattern above
6. Optionally add a `.claude/skills/<name>/SKILL.md` for Claude Code skill integration
