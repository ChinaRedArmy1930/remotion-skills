export interface ThemeConfig {
  background: string;
  surfaceColor: string;
  fillColor: string;
  borderColor: string;
  dividerColor: string;
  textColor: string;
  textFontSize: number;
  fontFamily: string;
  rowHeight: number;
  sidePadding: number;
  bottomPadding: number;
  labelFontSize: number;
  barRadius: number;
}

export const DefaultTheme: ThemeConfig = {
  background: 'transparent',
  surfaceColor: 'rgba(29, 29, 31, 0.6)',
  fillColor: '#0071e3',
  borderColor: 'rgba(255, 255, 255, 0.5)',
  dividerColor: 'rgba(255, 255, 255, 0.08)',
  textColor: 'rgba(255, 255, 255, 0.9)',
  textFontSize: 13,
  fontFamily: 'SF Pro Text, SF Pro Icons, Helvetica Neue, Helvetica, Arial, sans-serif',
  rowHeight: 36,
  sidePadding: 40,
  bottomPadding: 20,
  labelFontSize: 14,
  barRadius: 8,
};
