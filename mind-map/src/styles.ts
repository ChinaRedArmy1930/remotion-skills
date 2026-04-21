export interface ThemeConfig {
  background: string;
  nodeColors: string[];
  nodeBorderColors: string[];
  nodeTextColors: string[];
  rootNodeColor: string;
  rootNodeBorderColor: string;
  rootNodeTextColor: string;
  lineColor: string;
  lineWidth: number;
  fontFamily: string;
  rootFontSize: number;
  nodeFontSize: number;
  nodeShadow: string;
}

// 简约蓝白主题
export const TechTheme: ThemeConfig = {
  background: '#f5f7fa',
  nodeColors: ['#ffffff', '#ffffff', '#ffffff'],
  nodeBorderColors: ['#4a90d9', '#5ba0e8', '#6db3f0'],
  nodeTextColors: ['#1a1a1a', '#2a2a2a', '#333333'],
  rootNodeColor: '#ffffff',
  rootNodeBorderColor: '#3b7dd8',
  rootNodeTextColor: '#1a1a1a',
  lineColor: '#4a90d9',
  lineWidth: 2.5,
  fontFamily: 'SF Pro, -apple-system, BlinkMacSystemFont, sans-serif',
  rootFontSize: 18,
  nodeFontSize: 14,
  nodeShadow: '0 1px 6px rgba(0,0,0,0.06)',
};

export function getNodeStyle(theme: ThemeConfig, depth: number) {
  if (depth === 0) {
    return {
      bg: theme.rootNodeColor,
      border: theme.rootNodeBorderColor,
      text: theme.rootNodeTextColor,
      fontSize: theme.rootFontSize,
      shadow: theme.nodeShadow,
    };
  }
  const idx = (depth - 1) % theme.nodeColors.length;
  return {
    bg: theme.nodeColors[idx],
    border: theme.nodeBorderColors[idx],
    text: theme.nodeTextColors[idx],
    fontSize: theme.nodeFontSize,
    shadow: theme.nodeShadow,
  };
}
