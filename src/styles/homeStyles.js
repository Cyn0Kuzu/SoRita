/**
 * Optimized Styles for HomeScreen
 * Using common theme and reduced style definitions
 */

import { StyleSheet } from 'react-native';

import { colors, spacing, commonStyles, typography } from '../theme/theme';

export const homeStyles = StyleSheet.create({
  // Base styles
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },

  centerContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    elevation: 2,
    marginVertical: spacing.sm,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },

  spaceBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  // Specific styles for HomeScreen
  sortContainer: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
  },

  sortTab: {
    alignItems: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    flex: 1,
    paddingVertical: spacing.md,
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
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },

  // Verification banner
  verificationBanner: {
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    borderBottomColor: '#FFD700',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  verificationText: {
    ...typography.bodySmall,
    color: '#856404',
    flex: 1,
    fontWeight: '500',
    marginLeft: spacing.sm,
  },

  // Avatar styles
  avatarContainer: {
    ...commonStyles.shadow,
    alignItems: 'center',
    backgroundColor: colors.surface,
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  // FAB
  fab: {
    backgroundColor: colors.primary,
    bottom: spacing.xl,
    position: 'absolute',
    right: spacing.lg,
  },

  // Empty state
  emptyActionButton: {
    marginVertical: spacing.xs,
    minWidth: 200,
  },
});

export default homeStyles;
