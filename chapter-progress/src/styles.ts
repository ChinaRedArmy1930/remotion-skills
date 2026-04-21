export interface ThemeConfig {
  background: string;
  // 每层的颜色（从 level 1 开始）
  levelColors: string[];
  levelActiveColors: string[];
  textColor: string;
  textFontSize: number;
  fontFamily: string;
  playheadColor: string;
  playheadWidth: number;
  rowHeight: number;
  rowGap: number;
  sidePadding: number;
  bottomPadding: number;
  labelFontSize: number;
}

export const DefaultTheme: ThemeConfig = {
  background: '#1a1b2e',
  levelColors: ['#3b6cb5', '#4a8ad4', '#62a8e8'],
  levelActiveColors: ['#4b8cd8', '#62a8e8', '#80c0f5'],
  textColor: '#ffffff',
  textFontSize: 13,
  fontFamily: 'SF Pro, -apple-system, BlinkMacSystemFont, sans-serif',
  playheadColor: '#ff6b6b',
  playheadWidth: 2,
  rowHeight: 28,
  rowGap: 2,
  sidePadding: 40,
  bottomPadding: 20,
  labelFontSize: 14,
};
