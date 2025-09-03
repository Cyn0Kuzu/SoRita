/**
 * Optimized Styles for HomeScreen
 * Using common theme and reduced style definitions
 */

import { StyleSheet } from 'react-native';
import { colors, spacing, commonStyles, typography } from '../theme/theme';

export const homeStyles = StyleSheet.create({
  // Base styles
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
  
  // Specific styles for HomeScreen
  sortContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  
  sortTab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  
  activeSortTab: {
    borderBottomColor: colors.primary,
  },
  
  sortText: {
    ...typography.bodySmall,
    fontWeight: '500',
  },
  
  activeSortText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  
  feed: {
    flex: 1,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  
  // Verification banner
  verificationBanner: {
    backgroundColor: '#FFF3CD',
    borderBottomWidth: 1,
    borderBottomColor: '#FFD700',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  verificationText: {
    ...typography.bodySmall,
    color: '#856404',
    marginLeft: spacing.sm,
    fontWeight: '500',
    flex: 1,
  },
  
  // Avatar styles
  avatarContainer: {
    ...commonStyles.shadow,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // FAB
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    backgroundColor: colors.primary,
  },
  
  // Empty state
  emptyActionButton: {
    marginVertical: spacing.xs,
    minWidth: 200,
  },
});

export default homeStyles;
