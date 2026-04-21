import type { LayoutNode } from './layout';
import { flattenNodes, getMaxDepth } from './layout';

export const FRAMES_PER_DEPTH = 30;
export const FRAMES_PER_SIBLING = 8;
export const FRAMES_PER_CHAR = 5;

export interface NodeInterval {
  id: string;
  label: string;
  depth: number;
  startFrame: number;
  endFrame: number;
}

export function calcAppearFrames(root: LayoutNode): Map<string, number> {
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

export function calcTotalFrames(root: LayoutNode, appearFrames: Map<string, number>): number {
  const allNodes = flattenNodes(root);
  let maxFrame = 0;
  for (const node of allNodes) {
    const af = appearFrames.get(node.id) ?? 0;
    const typeEnd = af + 12 + node.label.length * FRAMES_PER_CHAR;
    if (typeEnd > maxFrame) maxFrame = typeEnd;
  }
  return maxFrame + 30;
}

export function calcNodeIntervals(
  root: LayoutNode,
  appearFrames: Map<string, number>
): Map<string, NodeInterval> {
  const intervals = new Map<string, NodeInterval>();
  const allNodes = flattenNodes(root);
  const maxDepth = getMaxDepth(root);

  // Leaf nodes: endFrame = typewriter completion
  for (const node of allNodes) {
    const start = appearFrames.get(node.id) ?? 0;
    if (node.children.length === 0) {
      const end = start + 12 + node.label.length * FRAMES_PER_CHAR;
      intervals.set(node.id, {
        id: node.id,
        label: node.label,
        depth: node.depth,
        startFrame: start,
        endFrame: end,
      });
    }
  }

  // Parent nodes: bottom-up by depth
  for (let d = maxDepth; d >= 0; d--) {
    for (const node of allNodes) {
      if (node.depth !== d || node.children.length === 0) continue;
      const start = appearFrames.get(node.id) ?? 0;
      const childEnds = node.children.map(
        (c) => intervals.get(c.id)!.endFrame
      );
      intervals.set(node.id, {
        id: node.id,
        label: node.label,
        depth: node.depth,
        startFrame: start,
        endFrame: Math.max(...childEnds),
      });
    }
  }

  return intervals;
}
