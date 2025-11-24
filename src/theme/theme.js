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

// Import DefaultTheme from react-native-paper
import { DefaultTheme as PaperDefaultTheme } from 'react-native-paper';

// Create theme compatible with react-native-paper
export const theme = {
  ...PaperDefaultTheme,
  colors: {
    ...PaperDefaultTheme.colors,
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

// Common Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Common Typography
export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  body: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  bodySmall: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    color: colors.textSecondary,
  },
};

// Common Styles
export const commonStyles = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginVertical: spacing.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shadow: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  button: {
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
};

export default theme;
