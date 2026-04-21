import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import {
  MindMapNode as DataType,
  layoutMindMap,
  LayoutNode,
  getMaxDepth,
  flattenNodes,
} from './layout';
import { ThemeConfig, getNodeStyle } from './styles';

interface MindMapProps {
  data: DataType;
  theme: ThemeConfig;
}

const FRAMES_PER_DEPTH = 30;
const FRAMES_PER_SIBLING = 8;
const LINE_GROW_DURATION = 25;
const FRAMES_PER_CHAR = 5;

const CANVAS_W = 1920;
const CANVAS_H = 1080;

export const DEMO_DATA: DataType = {
  label: '人工智能',
  children: [
    {
      label: '机器学习',
      children: [
        { label: '监督学习' },
        { label: '无监督学习' },
        { label: '强化学习' },
      ],
    },
    {
      label: '深度学习',
      children: [
        { label: 'CNN' },
        { label: 'RNN' },
        { label: 'Transformer' },
      ],
    },
    {
      label: '自然语言处理',
      children: [
        { label: '文本分类' },
        { label: '机器翻译' },
        { label: '情感分析' },
      ],
    },
    {
      label: '计算机视觉',
      children: [
        { label: '目标检测' },
        { label: '图像分割' },
      ],
    },
  ],
};

function getNodeSize(depth: number) {
  if (depth === 0) return { w: 160, h: 50 };
  return { w: 130, h: 38 };
}

function calcAppearFrames(root: LayoutNode): Map<string, number> {
  const map = new Map<string, number>();
  map.set(root.id, 0);

  function walk(parent: LayoutNode, parentFrame: number) {
    const sorted = [...parent.children].sort((a, b) => a.y - b.y);
    sorted.forEach((child, idx) => {
      const frame = parentFrame + FRAMES_PER_DEPTH + idx * FRAMES_PER_SIBLING;
      map.set(child.id, frame);
      walk(child, frame);
    });
  }

  walk(root, 0);
  return map;
}

function calcTotalFrames(root: LayoutNode, appearFrames: Map<string, number>): number {
  const allNodes = flattenNodes(root);
  let maxFrame = 0;
  for (const node of allNodes) {
    const af = appearFrames.get(node.id) ?? 0;
    const typeEnd = af + 12 + node.label.length * FRAMES_PER_CHAR;
    if (typeEnd > maxFrame) maxFrame = typeEnd;
  }
  return maxFrame + 30;
}

// 预计算每帧的居中偏移量（只看已出现的节点的几何中心）
function precalcOffsets(
  allNodes: LayoutNode[],
  appearFrames: Map<string, number>,
  totalFrames: number
): { dx: number; dy: number }[] {
  const offsets: { dx: number; dy: number }[] = [];
  let sumX = 0, sumY = 0, count = 0;

  // 按出现帧排序
  const sorted = [...allNodes].sort(
    (a, b) => (appearFrames.get(a.id) ?? 0) - (appearFrames.get(b.id) ?? 0)
  );

  let nodeIdx = 0;
  for (let f = 0; f < totalFrames; f++) {
    // 加入本帧出现的节点
    while (nodeIdx < sorted.length && (appearFrames.get(sorted[nodeIdx].id) ?? 0) <= f) {
      sumX += sorted[nodeIdx].x;
      sumY += sorted[nodeIdx].y;
      count++;
      nodeIdx++;
    }
    if (count === 0) {
      offsets.push({ dx: CANVAS_W / 2, dy: CANVAS_H / 2 });
    } else {
      offsets.push({
        dx: CANVAS_W / 2 - sumX / count,
        dy: CANVAS_H / 2 - sumY / count,
      });
    }
  }
  return offsets;
}

// 节点组件
const Node: React.FC<{
  node: LayoutNode;
  theme: ThemeConfig;
  appearFrame: number;
}> = ({ node, theme, appearFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const style = getNodeStyle(theme, node.depth);
  const { w, h } = getNodeSize(node.depth);

  const scaleSpring = spring({
    fps,
    frame: frame - appearFrame,
    config: { damping: 14, stiffness: 100, mass: 0.6 },
  });
  const scale = frame < appearFrame ? 0 : scaleSpring;
  const opacity = frame < appearFrame
    ? 0
    : interpolate(scaleSpring, [0, 0.6], [0, 1], { extrapolateRight: 'clamp' });

  const typeStartFrame = appearFrame + 12;
  const charsVisible = frame < typeStartFrame
    ? 0
    : Math.min(node.label.length, Math.floor((frame - typeStartFrame) / FRAMES_PER_CHAR) + 1);
  const displayText = node.label.substring(0, charsVisible);

  const skewX = -8;

  return (
    <div
      style={{
        position: 'absolute',
        left: node.x - w / 2,
        top: node.y - h / 2,
        width: w,
        height: h,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `scale(${scale}) skewX(${skewX}deg)`,
        opacity,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: style.bg,
          border: `2.5px solid ${style.border}`,
          borderRadius: 3,
          boxShadow: style.shadow,
        }}
      />
      <span
        style={{
          position: 'relative',
          color: style.text,
          fontSize: style.fontSize,
          fontFamily: theme.fontFamily,
          fontWeight: node.depth === 0 ? 500 : 400,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          letterSpacing: '0.3px',
          transform: `skewX(${-skewX}deg)`,
        }}
      >
        {displayText}
        {charsVisible < node.label.length && frame >= typeStartFrame && (
          <span style={{ opacity: 0.4 }}>|</span>
        )}
      </span>
    </div>
  );
};

// 连线组件
const Connection: React.FC<{
  from: LayoutNode;
  to: LayoutNode;
  theme: ThemeConfig;
  appearFrame: number;
}> = ({ from, to, theme, appearFrame }) => {
  const frame = useCurrentFrame();

  const fromSize = getNodeSize(from.depth);
  const toSize = getNodeSize(to.depth);

  const x1 = from.x + fromSize.w / 2 + 10;
  const y1 = from.y;
  const x2 = to.x - toSize.w / 2 - 10;
  const y2 = to.y;

  const cx = (x1 + x2) / 2;
  const d = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;

  const pathLength = 500;
  const lineProgress = interpolate(
    frame,
    [appearFrame, appearFrame + LINE_GROW_DURATION],
    [pathLength, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const opacity = frame < appearFrame ? 0 : interpolate(
    frame,
    [appearFrame, appearFrame + 8],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <path
      d={d}
      stroke={theme.lineColor}
      strokeWidth={theme.lineWidth}
      fill="none"
      strokeDasharray={pathLength}
      strokeDashoffset={lineProgress}
      opacity={opacity}
      strokeLinecap="round"
    />
  );
};

// 主组件
export const MindMap: React.FC<MindMapProps> = ({ data, theme }) => {
  const frame = useCurrentFrame();

  const layout = layoutMindMap(data, true);
  const allNodes = flattenNodes(layout);
  const appearFrames = calcAppearFrames(layout);
  const totalFrames = calcTotalFrames(layout, appearFrames);

  // 预计算每帧的目标偏移
  const offsets = precalcOffsets(allNodes, appearFrames, totalFrames);

  // 用指数移动平均做平滑：新节点出现时偏移不跳变，而是渐变过渡
  const alpha = 0.12;
  const smoothedOffsets: { dx: number; dy: number }[] = [];
  let emaDx = CANVAS_W / 2;
  let emaDy = CANVAS_H / 2;
  for (let i = 0; i < offsets.length; i++) {
    emaDx += alpha * (offsets[i].dx - emaDx);
    emaDy += alpha * (offsets[i].dy - emaDy);
    smoothedOffsets.push({ dx: emaDx, dy: emaDy });
  }

  const current = smoothedOffsets[Math.min(frame, smoothedOffsets.length - 1)];
  const dx = current.dx;
  const dy = current.dy;

  // 收集连线
  const connections: { from: LayoutNode; to: LayoutNode }[] = [];
  const collectConnections = (node: LayoutNode) => {
    for (const child of node.children) {
      connections.push({ from: node, to: child });
      collectConnections(child);
    }
  };
  collectConnections(layout);

  return (
    <AbsoluteFill style={{ background: theme.background, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `translate(${dx}px, ${dy}px)`,
          overflow: 'visible',
        }}
      >
        <svg width={CANVAS_W} height={CANVAS_H} style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}>
          {connections.map((conn, i) => (
            <Connection
              key={`conn-${i}`}
              from={conn.from}
              to={conn.to}
              theme={theme}
              appearFrame={appearFrames.get(conn.to.id) ?? 0}
            />
          ))}
        </svg>
        {allNodes.map((node) => (
          <Node
            key={node.id}
            node={node}
            theme={theme}
            appearFrame={appearFrames.get(node.id) ?? 0}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export { calcTotalFrames, calcAppearFrames };
