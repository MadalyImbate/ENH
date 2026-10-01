import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '../theme/useAppTheme';
import { radii, shadows, spacing } from '../theme/tokens';

type IOSCardProps = {
  variant?: 'elevated' | 'plain' | 'inset';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  padded?: boolean;
};

/**
 * iOS-grouped style card. Three variants:
 *  - elevated:   white surface with a soft drop shadow (default).
 *  - plain:      flat surface with subtle border, no shadow.
 *  - inset:      tinted muted fill, no shadow — used for nested groups.
 */
export function IOSCard({ variant = 'elevated', style, children, padded = true }: IOSCardProps) {
  const { colors } = useAppTheme();

  const variantStyle =
    variant === 'elevated'
      ? {
          backgroundColor: colors.surface,
          borderColor: colors.separator,
          borderWidth: StyleSheet.hairlineWidth,
          ...shadows.card,
        }
      : variant === 'inset'
      ? {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.separator,
          borderWidth: StyleSheet.hairlineWidth,
        }
      : {
          backgroundColor: colors.surface,
          borderColor: colors.separator,
          borderWidth: StyleSheet.hairlineWidth,
        };

  return <View style={[styles.base, padded && styles.padded, variantStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  padded: {
    padding: spacing.lg,
  },
});

export default IOSCard;
