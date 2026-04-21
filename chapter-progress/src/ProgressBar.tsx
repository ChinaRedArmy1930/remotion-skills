import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import type { TimedNode } from './types';
import { getMaxDepth } from './timing';
import type { ThemeConfig } from './styles';

interface ProgressBarProps {
  tree: TimedNode;
  totalFrames: number;
  theme: ThemeConfig;
  width: number;
  height: number;
}

interface Block {
  label: string;
  x: number;
  width: number;
  depth: number;
  startFrame: number;
  endFrame: number;
}

/**
 * 从 TimedNode 树构建火焰图布局。
 * rows[0] = depth 1, rows[1] = depth 2, ...
 * 父节点宽度 = 所有子节点宽度之和，子节点严格对齐在父节点上方。
 */
function buildFlameBlocks(
  tree: TimedNode,
  maxDisplayDepth: number,
  usableWidth: number,
  sidePadding: number
): Block[][] {
  const rows: Block[][] = [];

  function getDuration(node: TimedNode): number {
    if (node.children.length === 0) {
      return node.endFrame - node.startFrame;
    }
    return node.children.reduce((sum, c) => sum + getDuration(c), 0);
  }

  function ensureRow(idx: number) {
    while (rows.length <= idx) rows.push([]);
  }

  function layoutLevel(
    nodes: TimedNode[],
    startX: number,
    totalWidth: number
  ): Block[] {
    const totalDuration = nodes.reduce((sum, n) => sum + getDuration(n), 0);
    let currentX = startX;
    const blocks: Block[] = [];

    for (const node of nodes) {
      const dur = getDuration(node);
      const w = totalDuration > 0 ? (dur / totalDuration) * totalWidth : 0;
      blocks.push({
        label: node.label,
        x: currentX,
        width: w,
        depth: node.depth,
        startFrame: node.startFrame,
        endFrame: node.endFrame,
      });

      // 递归布局子节点，存入对应的 row
      if (node.children.length > 0 && node.depth < maxDisplayDepth) {
        const childRowIdx = node.depth; // depth 1 的子节点放 rows[1]
        ensureRow(childRowIdx);
        const childBlocks = layoutLevel(node.children, currentX, w);
        rows[childRowIdx].push(...childBlocks);
      }

      currentX += w;
    }

    return blocks;
  }

  // 布局 depth 1（底层）
  ensureRow(0);
  rows[0] = layoutLevel(tree.children, sidePadding, usableWidth);

  return rows.slice(0, maxDisplayDepth);
}

// 单个"水杯"色块：边框始终可见，蓝色填充随进度增长
const CupBlock: React.FC<{
  block: Block;
  frame: number;
  fillColor: string;
  borderColor: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
  rowHeight: number;
  isFirst: boolean;
  isLast: boolean;
}> = ({ block, frame, fillColor, borderColor, textColor, fontSize, fontFamily, rowHeight, isFirst, isLast }) => {
  const showLabel = block.width > 36;

  // 计算填充进度
  const duration = block.endFrame - block.startFrame;
  const elapsed = frame - block.startFrame;
  const fillProgress = duration > 0
    ? Math.min(Math.max(elapsed / duration, 0), 1)
    : 0;

  // 边框：左右和底边，根据是否是行首/行尾决定左边/右边
  const borderLeft = isFirst ? `2px solid ${borderColor}` : `1px solid ${borderColor}`;
  const borderRight = isLast ? `2px solid ${borderColor}` : `1px solid ${borderColor}`;

  return (
    <div
      style={{
        position: 'absolute',
        left: block.x,
        width: block.width,
        height: rowHeight,
        borderTop: `2px solid ${borderColor}`,
        borderBottom: `2px solid ${borderColor}`,
        borderLeft,
        borderRight,
        overflow: 'hidden',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* 蓝色填充：从左向右增长 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${fillProgress * 100}%`,
          background: fillColor,
        }}
      />
      {/* 标签文字 */}
      {showLabel && (
        <span
          style={{
            position: 'relative',
            zIndex: 1,
            color: textColor,
            fontSize,
            fontFamily,
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

export const ProgressBar: React.FC<ProgressBarProps> = ({
  tree,
  totalFrames,
  theme,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const maxDepth = getMaxDepth(tree);

  const displayLevels = Math.min(maxDepth, 3);
  const usableWidth = width - theme.sidePadding * 2;

  const rowHeight = theme.rowHeight;
  const rowGap = theme.rowGap;
  const totalBarHeight = displayLevels * rowHeight + (displayLevels - 1) * rowGap;
  const barBottom = theme.bottomPadding;

  // 构建火焰图布局
  const rows = buildFlameBlocks(tree, displayLevels, usableWidth, theme.sidePadding);

  // 当前章节标题
  const allNodes = flattenNodesSimple(tree);
  const currentNode = allNodes
    .filter((n) => frame >= n.startFrame && frame <= n.endFrame)
    .sort((a, b) => b.depth - a.depth)[0];

  return (
    <AbsoluteFill style={{ background: theme.background }}>
      {/* 当前章节标题 */}
      <div
        style={{
          position: 'absolute',
          top: height / 2 - 20,
          left: 0,
          width,
          textAlign: 'center',
          fontFamily: theme.fontFamily,
          fontSize: theme.labelFontSize,
          color: '#ffffff',
          opacity: currentNode ? interpolate(
            frame,
            [currentNode.startFrame, currentNode.startFrame + 10, currentNode.endFrame - 10, currentNode.endFrame],
            [0, 1, 1, 0.3],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          ) : 0,
        }}
      >
        {currentNode?.label ?? ''}
      </div>

      {/* 进度条区域 */}
      <div
        style={{
          position: 'absolute',
          bottom: barBottom,
          left: 0,
          width,
          height: totalBarHeight,
        }}
      >
        {/* 从下到上：row[0] = depth 1 (底部) → row[N-1] = depth N (顶部) */}
        {rows.map((rowBlocks, rowIdx) => {
          const colorIdx = rowIdx % theme.levelColors.length;
          const rowBottom = rowIdx * (rowHeight + rowGap);

          return (
            <div
              key={`row-${rowIdx}`}
              style={{
                position: 'absolute',
                bottom: rowBottom,
                left: 0,
                width,
                height: rowHeight,
              }}
            >
              {rowBlocks.map((block, blockIdx) => (
                <CupBlock
                  key={`block-${rowIdx}-${blockIdx}`}
                  block={block}
                  frame={frame}
                  fillColor={theme.levelColors[colorIdx]}
                  borderColor={theme.borderColor}
                  textColor={theme.textColor}
                  fontSize={theme.textFontSize}
                  fontFamily={theme.fontFamily}
                  rowHeight={rowHeight}
                  isFirst={blockIdx === 0}
                  isLast={blockIdx === rowBlocks.length - 1}
                />
              ))}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

function flattenNodesSimple(node: TimedNode): TimedNode[] {
  const result: TimedNode[] = [node];
  for (const child of node.children) {
    result.push(...flattenNodesSimple(child));
  }
  return result;
}
