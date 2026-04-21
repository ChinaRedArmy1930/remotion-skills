// 章节节点数据结构
export interface ChapterNode {
  label: string;
  children?: ChapterNode[];
  duration?: number; // 可选：手动指定该章节时长（帧数），仅对叶子节点生效
}

// 带有时间区间的节点
export interface TimedNode {
  id: string;
  label: string;
  depth: number;
  startFrame: number;
  endFrame: number;
  children: TimedNode[];
}
