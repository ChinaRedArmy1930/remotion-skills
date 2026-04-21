// 脑图节点数据结构
export interface MindMapNode {
  label: string;
  children?: MindMapNode[];
}

// 布局后的节点位置信息
export interface LayoutNode {
  id: string;
  label: string;
  x: number;
  y: number;
  depth: number;
  children: LayoutNode[];
  parent?: LayoutNode;
}

// 布局参数
export interface LayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  horizontalGap: number;
  verticalGap: number;
}

const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  nodeWidth: 140,
  nodeHeight: 44,
  horizontalGap: 180,
  verticalGap: 16,
};

// 画布尺寸
const CANVAS_W = 1920;
const CANVAS_H = 1080;

function getSubtreeHeight(node: MindMapNode, config: LayoutConfig): number {
  if (!node.children || node.children.length === 0) {
    return config.nodeHeight;
  }
  const childrenHeight = node.children.reduce(
    (sum, child) => sum + getSubtreeHeight(child, config),
    0
  );
  return childrenHeight + (node.children.length - 1) * config.verticalGap;
}

// 先以 (0,0) 为原点布局，后续统一偏移居中
function layoutRecursive(
  node: MindMapNode,
  x: number,
  yCenter: number,
  depth: number,
  config: LayoutConfig,
  counter: { value: number }
): LayoutNode {
  const id = `node-${counter.value++}`;
  const children: LayoutNode[] = [];

  const layoutNode: LayoutNode = {
    id,
    label: node.label,
    x,
    y: yCenter,
    depth,
    children,
  };

  if (node.children && node.children.length > 0) {
    const totalHeight = getSubtreeHeight(node, config);
    let currentY = yCenter - totalHeight / 2;

    for (const child of node.children) {
      const childHeight = getSubtreeHeight(child, config);
      const childCenterY = currentY + childHeight / 2;
      const childNode = layoutRecursive(
        child,
        x + config.nodeWidth + config.horizontalGap,
        childCenterY,
        depth + 1,
        config,
        counter
      );
      childNode.parent = layoutNode;
      children.push(childNode);
      currentY += childHeight + config.verticalGap;
    }
  }

  return layoutNode;
}

// 获取节点宽度（与 MindMap.tsx 中的 getNodeSize 保持一致）
function getNodeWidth(depth: number): number {
  return depth === 0 ? 160 : 130;
}

// 递归偏移所有节点
function offsetNodes(node: LayoutNode, dx: number, dy: number) {
  node.x += dx;
  node.y += dy;
  for (const child of node.children) {
    offsetNodes(child, dx, dy);
  }
}

// 计算所有节点的边界框
function getBounds(node: LayoutNode): { minX: number; maxX: number; minY: number; maxY: number } {
  const all = flattenNodes(node);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of all) {
    const hw = getNodeWidth(n.depth) / 2;
    const hh = (n.depth === 0 ? 50 : 38) / 2;
    if (n.x - hw < minX) minX = n.x - hw;
    if (n.x + hw > maxX) maxX = n.x + hw;
    if (n.y - hh < minY) minY = n.y - hh;
    if (n.y + hh > maxY) maxY = n.y + hh;
  }
  return { minX, maxX, minY, maxY };
}

export function layoutMindMap(
  root: MindMapNode,
  raw: boolean = false,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): LayoutNode {
  const counter = { value: 0 };
  // 以原点布局
  const tree = layoutRecursive(root, 0, 0, 0, config, counter);

  if (!raw) {
    // 计算边界框并居中到画布中央
    const bounds = getBounds(tree);
    const treeW = bounds.maxX - bounds.minX;
    const treeH = bounds.maxY - bounds.minY;
    const dx = (CANVAS_W - treeW) / 2 - bounds.minX;
    const dy = (CANVAS_H - treeH) / 2 - bounds.minY;
    offsetNodes(tree, dx, dy);
  }

  return tree;
}

export function getMaxDepth(node: LayoutNode): number {
  if (node.children.length === 0) return node.depth;
  return Math.max(...node.children.map(getMaxDepth));
}

export function flattenNodes(node: LayoutNode): LayoutNode[] {
  const result: LayoutNode[] = [node];
  for (const child of node.children) {
    result.push(...flattenNodes(child));
  }
  return result;
}
