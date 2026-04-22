import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import type { TimedNode } from './types';
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
  startFrame: number;
  endFrame: number;
  // 章节编号路径，如 "2.1.3"
  sectionNumber: string;
}

/**
 * 收集所有叶子节点，附带完整路径编号（DFS 顺序）
 */
function collectLeavesWithPath(node: TimedNode, prefix: string): { node: TimedNode; path: string }[] {
  if (node.children.length === 0) {
    return [{ node, path: prefix }];
  }
  const result: { node: TimedNode; path: string }[] = [];
  for (let i = 0; i < node.children.length; i++) {
    const childPath = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;
    result.push(...collectLeavesWithPath(node.children[i], childPath));
  }
  return result;
}

/**
 * 收集所有叶子节点（无编号）
 */
function collectLeaves(node: TimedNode): TimedNode[] {
  if (node.children.length === 0) return [node];
  const result: TimedNode[] = [];
  for (const child of node.children) {
    result.push(...collectLeaves(child));
  }
  return result;
}

/**
 * 获取节点持续时间
 */
function getDuration(node: TimedNode): number {
  if (node.children.length === 0) {
    return node.endFrame - node.startFrame;
  }
  return node.children.reduce((sum, c) => sum + getDuration(c), 0);
}

/**
 * 构建 2 层布局：
 * bottomRow = tree.children（直接子节点）
 * topRow = 所有叶子节点，对齐在各自父节点上方
 */
function buildTwoLayerBlocks(
  tree: TimedNode,
  usableWidth: number,
  sidePadding: number
): { bottomRow: Block[]; topRow: Block[] | null } {
  if (tree.children.length === 0) {
    return { bottomRow: [], topRow: null };
  }

  const bottomNodes = tree.children;
  const totalBottomDuration = bottomNodes.reduce((sum, n) => sum + getDuration(n), 0);
  let currentX = sidePadding;
  const bottomRow: Block[] = [];
  const parentRanges: { startX: number; endX: number }[] = [];

  for (let i = 0; i < bottomNodes.length; i++) {
    const node = bottomNodes[i];
    const dur = getDuration(node);
    const w = totalBottomDuration > 0 ? (dur / totalBottomDuration) * usableWidth : 0;
    bottomRow.push({
      label: node.label,
      x: currentX,
      width: w,
      startFrame: node.startFrame,
      endFrame: node.endFrame,
      sectionNumber: `${i + 1}`,
    });
    parentRanges.push({ startX: currentX, endX: currentX + w });
    currentX += w;
  }

  // 判断是否只有 1 层（tree.children 全是叶子）
  const allChildrenAreLeaves = bottomNodes.every(n => n.children.length === 0);
  if (allChildrenAreLeaves) {
    return { bottomRow, topRow: null };
  }

  // 上层：所有叶子节点，带真实路径编号
  const topRow: Block[] = [];
  for (let i = 0; i < bottomNodes.length; i++) {
    const parent = bottomNodes[i];
    const range = parentRanges[i];
    const leavesWithPath = collectLeavesWithPath(parent, `${i + 1}`);
    const leavesTotalDuration = leavesWithPath.reduce((sum, l) => sum + getDuration(l.node), 0);
    let leafX = range.startX;
    const parentWidth = range.endX - range.startX;

    for (const { node: leaf, path } of leavesWithPath) {
      const dur = getDuration(leaf);
      const w = leavesTotalDuration > 0 ? (dur / leavesTotalDuration) * parentWidth : 0;
      topRow.push({
        label: leaf.label,
        x: leafX,
        width: w,
        startFrame: leaf.startFrame,
        endFrame: leaf.endFrame,
        sectionNumber: path,
      });
      leafX += w;
    }
  }

  return { bottomRow, topRow };
}

/**
 * 获取当前播放节点的完整路径编号，如 "2.1.3 MySQL"
 */
function getCurrentSectionLabel(
  tree: TimedNode,
  frame: number
): string | null {
  // DFS 找到当前帧对应的最深活跃节点，同时记录路径编号
  function findDeepest(
    node: TimedNode,
    path: string
  ): { node: TimedNode; path: string } | null {
    const isActive = frame >= node.startFrame && frame <= node.endFrame;
    if (!isActive) return null;

    let deepest: { node: TimedNode; path: string } | null = { node, path };

    for (let i = 0; i < node.children.length; i++) {
      const childPath = path ? `${path}.${i + 1}` : `${i + 1}`;
      const result = findDeepest(node.children[i], childPath);
      if (result && result.node.depth > deepest!.node.depth) {
        deepest = result;
      }
    }

    return deepest;
  }

  // 从 root 的子节点开始编号
  for (let i = 0; i < tree.children.length; i++) {
    const result = findDeepest(tree.children[i], `${i + 1}`);
    if (result) {
      return `${result.path} ${result.node.label}`;
    }
  }
  return null;
}

// 色块：白色粗边框 + 居中文字
const CupBlock: React.FC<{
  block: Block;
  frame: number;
  fillColor: string;
  surfaceColor: string;
  borderColor: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
  rowHeight: number;
  isFirst: boolean;
  isLast: boolean;
  isTopRow: boolean;
  isBottomRow: boolean;
  barRadius: number;
  breadcrumb?: string; // 底层色块专用：面包屑路径，如 "大语言模型→GPT系列"
}> = ({ block, frame, fillColor, surfaceColor, borderColor, textColor, fontSize, fontFamily, rowHeight, isFirst, isLast, isTopRow, isBottomRow, barRadius, breadcrumb }) => {
  const duration = block.endFrame - block.startFrame;
  const elapsed = frame - block.startFrame;
  const fillProgress = duration > 0
    ? Math.min(Math.max(elapsed / duration, 0), 1)
    : 0;

  // 底层色块：有面包屑时显示面包屑，否则显示名称
  // 上层色块：播放时显示编号+名称，否则只显示名称
  const isActive = frame >= block.startFrame && frame <= block.endFrame;
  let displayLabel: string;
  if (breadcrumb) {
    displayLabel = breadcrumb;
  } else {
    displayLabel = isActive ? `${block.sectionNumber} ${block.label}` : block.label;
  }

  const rtl = isTopRow && isFirst ? barRadius : 0;
  const rtr = isTopRow && isLast ? barRadius : 0;
  const rbl = isBottomRow && isFirst ? barRadius : 0;
  const rbr = isBottomRow && isLast ? barRadius : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: block.x,
        width: block.width,
        height: rowHeight,
        background: surfaceColor,
        border: `1.5px solid ${borderColor}`,
        overflow: 'hidden',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderTopLeftRadius: rtl,
        borderTopRightRadius: rtr,
        borderBottomLeftRadius: rbl,
        borderBottomRightRadius: rbr,
      }}
    >
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
      <ScrollingLabel
        label={displayLabel}
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

// 滚动文字组件（居中）
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
  const padding = 6;
  const availableWidth = blockWidth - padding * 2 - 3;

  React.useEffect(() => {
    if (textRef.current) {
      setTextWidth(textRef.current.scrollWidth);
    }
  }, [label, fontSize, fontFamily]);

  const needsScroll = textWidth > availableWidth && availableWidth > 0;
  const isActive = frame >= startFrame && frame <= endFrame;

  if (blockWidth < 36) return null;

  // 滚动偏移：慢速滚动，播放结束后回到起始
  const scrollRange = textWidth - availableWidth;
  const cycleFrames = 120; // 慢速：4秒一个来回
  const localFrame = isActive ? frame - startFrame : 0;
  const progress = (localFrame % cycleFrames) / cycleFrames;
  const offset = (needsScroll && isActive) ? scrollRange * (0.5 - 0.5 * Math.cos(progress * 2 * Math.PI)) : 0;

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden',
        width: availableWidth,
        display: 'flex',
        justifyContent: 'center',
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
          letterSpacing: '-0.224px',
          whiteSpace: 'nowrap',
          transform: needsScroll ? `translateX(${-offset}px)` : undefined,
          textAlign: 'center',
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

  const usableWidth = width - theme.sidePadding * 2;
  const rowHeight = theme.rowHeight;
  const { bottomRow, topRow } = buildTwoLayerBlocks(tree, usableWidth, theme.sidePadding);
  const hasTwoRows = topRow !== null;
  const totalRows = hasTwoRows ? 2 : (bottomRow.length > 0 ? 1 : 0);
  const totalBarHeight = totalRows * rowHeight;
  const barBottom = theme.bottomPadding;

  // 当前章节：显示 X.X.X 格式
  const sectionLabel = getCurrentSectionLabel(tree, frame);

  // 计算每个底层色块的面包屑路径
  // 找到当前活跃的叶子节点，然后构建从底层章节到叶子直接父级的路径
  const bottomBreadcrumbs = hasTwoRows ? bottomRow.map((bottomBlock, blockIdx) => {
    if (!(frame >= bottomBlock.startFrame && frame <= bottomBlock.endFrame)) {
      return undefined; // 非活跃的大章节，不显示面包屑
    }
    // 找到当前底层章节内活跃的叶子节点
    const parentNode = tree.children[blockIdx];
    const activeLeaf = findActiveLeaf(parentNode, frame);
    if (!activeLeaf || activeLeaf.depth <= parentNode.depth + 1) {
      return undefined; // 叶子直接是底层子节点（只有2层），不需要面包屑
    }
    // 构建从底层章节到叶子直接父级的带编号路径
    const path = buildBreadcrumb(parentNode, activeLeaf, bottomBlock.sectionNumber);
    return path ? `${bottomBlock.sectionNumber} ${bottomBlock.label}→${path}` : undefined;
  }) : [];

  const renderRow = (
    blocks: Block[],
    rowIdx: number,
    isTop: boolean,
    isBottom: boolean,
    breadcrumbs?: (string | undefined)[]
  ) => (
    <div
      key={`row-${rowIdx}`}
      style={{
        position: 'absolute',
        bottom: rowIdx * rowHeight,
        left: 0,
        width,
        height: rowHeight,
      }}
    >
      {blocks.map((block, blockIdx) => (
        <CupBlock
          key={`block-${rowIdx}-${blockIdx}`}
          block={block}
          frame={frame}
          fillColor={theme.fillColor}
          surfaceColor={theme.surfaceColor}
          borderColor={theme.borderColor}
          textColor={theme.textColor}
          fontSize={theme.textFontSize}
          fontFamily={theme.fontFamily}
          rowHeight={rowHeight}
          isFirst={blockIdx === 0}
          isLast={blockIdx === blocks.length - 1}
          isTopRow={isTop}
          isBottomRow={isBottom}
          barRadius={theme.barRadius}
          breadcrumb={breadcrumbs?.[blockIdx]}
        />
      ))}
    </div>
  );

  return (
    <AbsoluteFill style={{ background: theme.background }}>
      {/* 当前章节标题：X.X.X 格式 */}
      <div
        style={{
          position: 'absolute',
          top: height / 2 - 20,
          left: 0,
          width,
          textAlign: 'center',
          fontFamily: theme.fontFamily,
          fontSize: theme.labelFontSize,
          fontWeight: 600,
          letterSpacing: '-0.224px',
          color: '#ffffff',
          opacity: sectionLabel ? (() => {
            const allNodes = flattenNodesSimple(tree);
            const currentNode = allNodes
              .filter((n) => frame >= n.startFrame && frame <= n.endFrame)
              .sort((a, b) => b.depth - a.depth)[0];
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
          })() : 0,
        }}
      >
        {sectionLabel ?? ''}
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
        {hasTwoRows ? (
          <>
            {renderRow(topRow!, 1, true, false)}
            {renderRow(bottomRow, 0, false, true, bottomBreadcrumbs)}
          </>
        ) : (
          renderRow(bottomRow, 0, true, true)
        )}
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

/**
 * 找到当前帧活跃的最深叶子节点
 */
function findActiveLeaf(node: TimedNode, frame: number): TimedNode | null {
  if (node.children.length === 0) {
    return (frame >= node.startFrame && frame <= node.endFrame) ? node : null;
  }
  for (const child of node.children) {
    const result = findActiveLeaf(child, frame);
    if (result) return result;
  }
  return null;
}

/**
 * 从 parentNode 到 targetLeaf 的面包屑路径（不含 parentNode 本身）
 * 带编号，例如 "1.2 开源模型"
 */
function buildBreadcrumb(parentNode: TimedNode, targetLeaf: TimedNode, parentSectionNumber: string): string | null {
  function search(node: TimedNode, sectionPrefix: string, path: string[]): string[] | null {
    if (node === targetLeaf) return path;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const childSection = sectionPrefix ? `${sectionPrefix}.${i + 1}` : `${i + 1}`;
      const label = `${childSection} ${child.label}`;
      const result = search(child, childSection, [...path, label]);
      if (result) return result;
    }
    return null;
  }
  // 从 parentNode 的子节点开始，用 parentSectionNumber 作为前缀
  const result = search(parentNode, parentSectionNumber, []);
  if (!result || result.length === 0) return null;
  // 去掉最后一个（叶子节点自身），只保留中间路径
  return result.slice(0, -1).join('→');
}
