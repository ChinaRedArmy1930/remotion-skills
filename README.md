# remotion-skills

Reusable Remotion animation skills. Each directory is a standalone, runnable project with a Claude Code skill definition.

## Skills

### [mind-map](./mind-map/)

XMind-style mind map animation with dynamic centering, typewriter text, and parallelogram nodes.

```bash
cd mind-map
npm install
npm run dev          # preview
npm run build:custom # render with data.json
```

## Using with Claude Code

Clone this repo and copy the skill directory to your project's `.claude/skills/`:

```bash
cp -r mind-map /your-project/.claude/skills/mind-map
```

Or use as a reference template — read the SKILL.md in each skill directory to understand the implementation.
