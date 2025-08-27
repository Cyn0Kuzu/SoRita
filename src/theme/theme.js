import { DefaultTheme } from 'react-native-paper';

// Brand: So (Blue) + Rita (Green) - Daha koyu renkler
export const brandColors = {
  soBlue: '#0369a1', // Daha koyu mavi
  ritaGreen: '#059669', // Daha koyu yeşil
  darkText: '#0f172a',
  lightText: '#64748b',
  background: '#f1f5f9',
  surface: '#ffffff',
  danger: '#dc2626',
};

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: brandColors.soBlue,
    secondary: brandColors.ritaGreen,
    background: brandColors.background,
    surface: brandColors.surface,
    text: brandColors.darkText,
    placeholder: brandColors.lightText,
    error: brandColors.danger,
  },
};

export const colors = {
  primary: brandColors.soBlue,
  secondary: brandColors.ritaGreen,
  text: brandColors.darkText,
  textPrimary: brandColors.darkText,
  textSecondary: brandColors.lightText,
  background: brandColors.background,
  surface: brandColors.surface,
  card: brandColors.surface,
  white: '#ffffff',
  border: '#e2e8f0',
  error: brandColors.danger,
  success: '#10b981',
  lightBackground: '#f8fafc',
};
