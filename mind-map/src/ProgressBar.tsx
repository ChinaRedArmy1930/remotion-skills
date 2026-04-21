import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { NodeInterval } from './timing';
import type { ThemeConfig } from './styles';

interface ProgressBarProps {
  intervals: Map<string, NodeInterval>;
  rootId: string;
  totalFrames: number;
  theme: ThemeConfig;
}

const BAR_WIDTH = 1920;
const ROW_HEIGHT = 24;
const ROW_GAP = 2;
const MAX_LEVELS = 3;
const BOTTOM_PADDING = 10;
const SIDE_PADDING = 20;
const TOTAL_BAR_HEIGHT = MAX_LEVELS * ROW_HEIGHT + (MAX_LEVELS - 1) * ROW_GAP;

interface Block {
  label: string;
  x: number;
  width: number;
  depth: number;
  startFrame: number;
  endFrame: number;
}

function buildIcicleRows(
  intervals: Map<string, NodeInterval>,
  rootId: string,
  totalFrames: number
): Block[][] {
  const root = intervals.get(rootId);
  if (!root) return [];

  const usableWidth = BAR_WIDTH - SIDE_PADDING * 2;
  const rows: Block[][] = [];

  // DFS to collect nodes at each display level
  function collectLevel(parentId: string, level: number) {
    if (level > MAX_LEVELS) return;
    const parent = intervals.get(parentId);
    if (!parent) return;

    const blocks: Block[] = [];
    for (const [, interval] of intervals) {
      // Find direct children of parentId at this depth
      if (
        interval.depth === level &&
        interval.startFrame >= parent.startFrame &&
        interval.endFrame <= parent.endFrame
      ) {
        // Check this is actually a descendant, not just overlapping
        blocks.push({
          label: interval.label,
          x: SIDE_PADDING + (interval.startFrame / totalFrames) * usableWidth,
          width: ((interval.endFrame - interval.startFrame) / totalFrames) * usableWidth,
          depth: interval.depth,
          startFrame: interval.startFrame,
          endFrame: interval.endFrame,
        });
      }
    }

    // Sort by startFrame and deduplicate
    blocks.sort((a, b) => a.startFrame - b.startFrame);

    // Only keep blocks that are actual children (within parent's time range)
    // For level 1: direct children of root
    // For level 2+: children of level-1 nodes
    if (blocks.length > 0 && level <= MAX_LEVELS) {
      // Ensure we have enough rows
      while (rows.length < level) rows.push([]);
      rows[level - 1].push(...blocks);
    }

    // Recurse into children for next level
    if (level < MAX_LEVELS) {
      // Find unique level-1 parents to recurse into
      const seenParents = new Set<string>();
      for (const [, interval] of intervals) {
        if (
          interval.depth === level + 1 &&
          interval.startFrame >= parent.startFrame &&
          interval.endFrame <= parent.endFrame &&
          !seenParents.has(interval.id)
        ) {
          seenParents.add(interval.id);
        }
      }
    }
  }

  // Build each level properly
  for (let level = 1; level <= MAX_LEVELS; level++) {
    const blocks: Block[] = [];
    for (const [, interval] of intervals) {
      if (interval.depth !== level) continue;
      blocks.push({
        label: interval.label,
        x: SIDE_PADDING + (interval.startFrame / totalFrames) * usableWidth,
        width: ((interval.endFrame - interval.startFrame) / totalFrames) * usableWidth,
        depth: interval.depth,
        startFrame: interval.startFrame,
        endFrame: interval.endFrame,
      });
    }
    blocks.sort((a, b) => a.startFrame - b.startFrame);
    rows.push(blocks);
  }

  return rows;
}

const IcicleBlock: React.FC<{
  block: Block;
  isActive: boolean;
  color: string;
}> = ({ block, isActive, color }) => {
  const showLabel = block.width > 36;

  return (
    <div
      style={{
        position: 'absolute',
        left: block.x,
        width: block.width,
        height: ROW_HEIGHT,
        background: isActive ? lightenColor(color, 30) : color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'background 0.1s',
      }}
    >
      {showLabel && (
        <span
          style={{
            color: '#fff',
            fontSize: 11,
            fontFamily: 'SF Pro, -apple-system, BlinkMacSystemFont, sans-serif',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            paddingLeft: 4,
            paddingRight: 4,
          }}
        >
          {block.label}
        </span>
      )}
    </div>
  );
};

function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  intervals,
  rootId,
  totalFrames,
  theme,
}) => {
  const frame = useCurrentFrame();
  const rows = buildIcicleRows(intervals, rootId, totalFrames);

  const colors = theme.progressBarColors ?? ['#4a90d9', '#5ba0e8', '#6db3f0'];
  const playheadColor = theme.playheadColor ?? '#ff6b6b';

  const usableWidth = BAR_WIDTH - SIDE_PADDING * 2;
  const playheadX = SIDE_PADDING + (frame / totalFrames) * usableWidth;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: BOTTOM_PADDING,
        left: 0,
        width: BAR_WIDTH,
        height: TOTAL_BAR_HEIGHT,
        pointerEvents: 'none',
      }}
    >
      {/* Background gradient for readability */}
      <div
        style={{
          position: 'absolute',
          inset: -8,
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.25))',
          borderRadius: 4,
        }}
      />

      {/* Rows: bottom row = index 0 (level 1), top row = index 2 (level 3) */}
      {rows.map((row, rowIdx) => {
        const yPos = (rows.length - 1 - rowIdx) * (ROW_HEIGHT + ROW_GAP);
        const color = colors[rowIdx % colors.length];
        return (
          <div
            key={`row-${rowIdx}`}
            style={{
              position: 'absolute',
              bottom: yPos,
              left: 0,
              width: BAR_WIDTH,
              height: ROW_HEIGHT,
            }}
          >
            {row.map((block, blockIdx) => (
              <IcicleBlock
                key={`block-${rowIdx}-${blockIdx}`}
                block={block}
                isActive={frame >= block.startFrame && frame <= block.endFrame}
                color={color}
              />
            ))}
          </div>
        );
      })}

      {/* Playhead line */}
      <div
        style={{
          position: 'absolute',
          left: playheadX - 1,
          bottom: -4,
          width: 2,
          height: TOTAL_BAR_HEIGHT + 8,
          background: playheadColor,
          borderRadius: 1,
          boxShadow: `0 0 4px ${playheadColor}`,
        }}
      />
    </div>
  );
};
