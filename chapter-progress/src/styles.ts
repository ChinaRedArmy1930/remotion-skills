export interface ThemeConfig {
  background: string;
  borderColor: string;
  levelColors: string[];
  textColor: string;
  textFontSize: number;
  fontFamily: string;
  rowHeight: number;
  sidePadding: number;
  bottomPadding: number;
  labelFontSize: number;
}

export const DefaultTheme: ThemeConfig = {
  background: '#1a1b2e',
  borderColor: '#ffffff',
  levelColors: ['#2563eb', '#3b82f6', '#60a5fa'],
  textColor: '#ffffff',
  textFontSize: 13,
  fontFamily: 'SF Pro, -apple-system, BlinkMacSystemFont, sans-serif',
  rowHeight: 36,
  sidePadding: 40,
  bottomPadding: 20,
  labelFontSize: 14,
};
