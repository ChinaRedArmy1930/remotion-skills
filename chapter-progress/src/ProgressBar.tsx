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
  isTopRow: boolean;
}> = ({ block, frame, fillColor, borderColor, textColor, fontSize, fontFamily, rowHeight, isFirst, isLast, isTopRow }) => {
  // 计算填充进度
  const duration = block.endFrame - block.startFrame;
  const elapsed = frame - block.startFrame;
  const fillProgress = duration > 0
    ? Math.min(Math.max(elapsed / duration, 0), 1)
    : 0;

  // 边框：只有最顶行有 borderTop，所有行都有 borderBottom，避免双线
  const borderLeft = isFirst ? `2px solid ${borderColor}` : `1px solid ${borderColor}`;
  const borderRight = isLast ? `2px solid ${borderColor}` : `1px solid ${borderColor}`;
  const borderTopStyle = isTopRow ? `2px solid ${borderColor}` : 'none';

  return (
    <div
      style={{
        position: 'absolute',
        left: block.x,
        width: block.width,
        height: rowHeight,
        borderTop: borderTopStyle,
        borderBottom: `2px solid ${borderColor}`,
        borderLeft,
        borderRight,
        overflow: 'hidden',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
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
      {/* 标签文字（滚动效果） */}
      <ScrollingLabel
        label={block.label}
        blockWidth={block.width}
        textColor={textColor}
        fontSize={fontSize}
        fontFamily={fontFamily}
        startFrame={block.startFrame}
        endFrame={block.endFrame}
      />
    </div>
  );
};

// 滚动文字组件：文字过长时自动左右滚动
const ScrollingLabel: React.FC<{
  label: string;
  blockWidth: number;
  textColor: string;
  fontSize: number;
  fontFamily: string;
  startFrame: number;
  endFrame: number;
}> = ({ label, blockWidth, textColor, fontSize, fontFamily, startFrame, endFrame }) => {
  const frame = useCurrentFrame();
  const textRef = React.useRef<HTMLSpanElement>(null);
  const [textWidth, setTextWidth] = React.useState(0);
  const padding = 8;
  const availableWidth = blockWidth - padding * 2 - 4; // 4 for borders

  React.useEffect(() => {
    if (textRef.current) {
      setTextWidth(textRef.current.scrollWidth);
    }
  }, [label, fontSize, fontFamily]);

  const needsScroll = textWidth > availableWidth && availableWidth > 0;
  const isActive = frame >= startFrame && frame <= endFrame;

  // 文字过短时不显示
  if (blockWidth < 36) return null;

  // 不需要滚动
  if (!needsScroll) {
    return (
      <span
        style={{
          position: 'relative',
          zIndex: 1,
          color: textColor,
          fontSize,
          fontFamily,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          paddingLeft: padding,
          paddingRight: padding,
        }}
      >
        {label}
      </span>
    );
  }

  // 滚动动画：在章节激活期间来回滚动
  const scrollRange = textWidth - availableWidth;
  const cycleFrames = 60; // 一个来回的帧数
  const localFrame = isActive ? frame - startFrame : 0;
  const progress = (localFrame % cycleFrames) / cycleFrames;
  // 使用正弦波实现平滑来回滚动
  const offset = scrollRange * (0.5 - 0.5 * Math.cos(progress * 2 * Math.PI));

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden',
        width: availableWidth,
        marginLeft: padding,
      }}
    >
      <span
        ref={textRef}
        style={{
          display: 'inline-block',
          color: textColor,
          fontSize,
          fontFamily,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          transform: `translateX(${-offset}px)`,
        }}
      >
        {label}
      </span>
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
  const totalBarHeight = displayLevels * rowHeight;
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
          opacity: (() => {
            if (!currentNode) return 0;
            const dur = currentNode.endFrame - currentNode.startFrame;
            const fade = Math.min(10, Math.floor(dur / 3));
            return interpolate(
              frame,
              [
                currentNode.startFrame,
                currentNode.startFrame + fade,
                currentNode.endFrame - fade,
                currentNode.endFrame,
              ],
              [0, 1, 1, 0.3],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );
          })(),
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
          const rowBottom = rowIdx * rowHeight;
          const isTopRow = rowIdx === rows.length - 1;

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
                  isTopRow={isTopRow}
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
