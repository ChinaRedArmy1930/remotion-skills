import type { ChapterNode, TimedNode } from './types';

// 默认每字符打字时长（帧）
const DEFAULT_FRAMES_PER_CHAR = 5;
// 打字开始前的等待帧数
const TYPE_START_DELAY = 12;
// 章节之间的间隔帧数
const DEFAULT_CHAPTER_GAP = 30;

/**
 * 将 ChapterNode 树转换为 TimedNode 树，计算每个节点的 startFrame/endFrame。
 *
 * DFS 遍历：
 * - 叶子节点：时长 = TYPE_START_DELAY + label.length * FRAMES_PER_CHAR (或手动 duration)
 * - 父节点：时长 = 所有子节点时长之和 + 间隔
 * - startFrame 基于前序 DFS 累加
 */
export function calcTimedTree(
  root: ChapterNode,
  options?: {
    framesPerChar?: number;
    chapterGap?: number;
  }
): TimedNode {
  const framesPerChar = options?.framesPerChar ?? DEFAULT_FRAMES_PER_CHAR;
  const chapterGap = options?.chapterGap ?? DEFAULT_CHAPTER_GAP;
  let counter = 0;

  function build(node: ChapterNode, depth: number, startFrame: number): TimedNode {
    const id = `node-${counter++}`;
    const children: TimedNode[] = [];

    if (!node.children || node.children.length === 0) {
      // 叶子节点
      const duration = node.duration ?? (TYPE_START_DELAY + node.label.length * framesPerChar);
      return {
        id,
        label: node.label,
        depth,
        startFrame,
        endFrame: startFrame + duration,
        children: [],
      };
    }

    // 有子节点：依次排列子节点
    let currentFrame = startFrame;
    for (const child of node.children) {
      const timedChild = build(child, depth + 1, currentFrame);
      children.push(timedChild);
      currentFrame = timedChild.endFrame + chapterGap;
    }

    return {
      id,
      label: node.label,
      depth,
      startFrame,
      endFrame: currentFrame - chapterGap, // 去掉最后一个 gap
      children,
    };
  }

  return build(root, 0, 0);
}

/**
 * 获取树的最大深度
 */
export function getMaxDepth(node: TimedNode): number {
  if (node.children.length === 0) return node.depth;
  return Math.max(...node.children.map(getMaxDepth));
}

/**
 * 展平节点列表（DFS 顺序）
 */
export function flattenNodes(node: TimedNode): TimedNode[] {
  const result: TimedNode[] = [node];
  for (const child of node.children) {
    result.push(...flattenNodes(child));
  }
  return result;
}

/**
 * 获取指定深度的所有节点（DFS 顺序）
 */
export function getNodesAtDepth(node: TimedNode, depth: number): TimedNode[] {
  if (node.depth === depth) return [node];
  const result: TimedNode[] = [];
  for (const child of node.children) {
    result.push(...getNodesAtDepth(child, depth));
  }
  return result;
}

/**
 * 计算总帧数（根节点的 endFrame + 尾部缓冲）
 */
export function calcTotalFrames(root: TimedNode, buffer: number = 30): number {
  return root.endFrame + buffer;
}
