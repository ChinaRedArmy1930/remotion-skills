import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import type { TimedNode } from './types';
import { getMaxDepth, getNodesAtDepth } from './timing';
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
 * 将指定深度的节点转换为色块布局
 */
function buildBlocks(
  tree: TimedNode,
  depth: number,
  totalFrames: number,
  usableWidth: number,
  sidePadding: number
): Block[] {
  const nodes = getNodesAtDepth(tree, depth);
  return nodes.map((node) => ({
    label: node.label,
    x: sidePadding + (node.startFrame / totalFrames) * usableWidth,
    width: ((node.endFrame - node.startFrame) / totalFrames) * usableWidth,
    depth: node.depth,
    startFrame: node.startFrame,
    endFrame: node.endFrame,
  }));
}

// 单个色块
const IcicleBlock: React.FC<{
  block: Block;
  isActive: boolean;
  color: string;
  activeColor: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
  rowHeight: number;
}> = ({ block, isActive, color, activeColor, textColor, fontSize, fontFamily, rowHeight }) => {
  const showLabel = block.width > 40;

  return (
    <div
      style={{
        position: 'absolute',
        left: block.x,
        width: Math.max(block.width - 1, 0), // 1px 间距
        height: rowHeight,
        background: isActive ? activeColor : color,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {showLabel && (
        <span
          style={{
            color: textColor,
            fontSize,
            fontFamily,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            paddingLeft: 6,
            paddingRight: 6,
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

  // 显示的层级：depth 1 到 maxDepth（最多3层）
  const displayLevels = Math.min(maxDepth, 3);
  const usableWidth = width - theme.sidePadding * 2;

  const totalBarHeight = displayLevels * theme.rowHeight + (displayLevels - 1) * theme.rowGap;
  const barBottom = theme.bottomPadding;

  // 播放头位置
  const progress = frame / totalFrames;
  const playheadX = theme.sidePadding + progress * usableWidth;

  // 顶部标签 - 显示当前正在播放的章节名
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
        {/* 背景渐变 */}
        <div
          style={{
            position: 'absolute',
            inset: -10,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.3))',
            borderRadius: 4,
          }}
        />

        {/* 从下到上：depth 1 (底部) → depth N (顶部) */}
        {Array.from({ length: displayLevels }, (_, i) => {
          const depth = i + 1; // depth 1, 2, 3
          const colorIdx = i % theme.levelColors.length;
          const blocks = buildBlocks(tree, depth, totalFrames, usableWidth, theme.sidePadding);
          const rowBottom = i * (theme.rowHeight + theme.rowGap);

          return (
            <div
              key={`row-${depth}`}
              style={{
                position: 'absolute',
                bottom: rowBottom,
                left: 0,
                width,
                height: theme.rowHeight,
              }}
            >
              {blocks.map((block, blockIdx) => (
                <IcicleBlock
                  key={`block-${depth}-${blockIdx}`}
                  block={block}
                  isActive={frame >= block.startFrame && frame <= block.endFrame}
                  color={theme.levelColors[colorIdx]}
                  activeColor={theme.levelActiveColors[colorIdx]}
                  textColor={theme.textColor}
                  fontSize={theme.textFontSize}
                  fontFamily={theme.fontFamily}
                  rowHeight={theme.rowHeight}
                />
              ))}
            </div>
          );
        })}

        {/* 播放头竖线 */}
        <div
          style={{
            position: 'absolute',
            left: playheadX - theme.playheadWidth / 2,
            bottom: -6,
            width: theme.playheadWidth,
            height: totalBarHeight + 12,
            background: theme.playheadColor,
            borderRadius: 1,
            boxShadow: `0 0 6px ${theme.playheadColor}`,
          }}
        />
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
