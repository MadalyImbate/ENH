import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import PressableScale from './PressableScale';
import { useAppTheme } from '../theme/useAppTheme';
import { radii, type as typo } from '../theme/tokens';

type HapticType = 'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

type IOSButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'filled' | 'tinted' | 'plain' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  iconLeft?: string;
  iconRight?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  hapticType?: HapticType | 'none';
  destructive?: boolean;
};

/**
 * iOS-style button. Three core variants mirror UIKit's filled / tinted / plain.
 * Outline is included as a fourth helper. Springs on press, supports haptic.
 */
export function IOSButton({
  title,
  onPress,
  variant = 'filled',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  iconLeft,
  iconRight,
  style,
  textStyle,
  hapticType = 'medium',
  destructive = false,
}: IOSButtonProps) {
  const { colors } = useAppTheme();

  const palette = destructive
    ? {
        bg: variant === 'filled' ? colors.error : variant === 'tinted' ? colors.errorSoftBg : 'transparent',
        fg: variant === 'filled' ? colors.labelOnPrimary : colors.error,
        border: colors.error,
      }
    : {
        bg: variant === 'filled' ? colors.primary : variant === 'tinted' ? colors.primarySoftBg : 'transparent',
        fg:
          variant === 'filled'
            ? colors.labelOnPrimary
            : variant === 'tinted'
            ? colors.primarySoftFg
            : colors.primary,
        border: variant === 'outline' ? colors.separatorStrong : 'transparent',
      };

  const sizing =
    size === 'sm'
      ? { paddingVertical: 8, paddingHorizontal: 14, fontSize: 13, iconSize: 16, gap: 6 }
      : size === 'lg'
      ? { paddingVertical: 16, paddingHorizontal: 22, fontSize: 16, iconSize: 20, gap: 10 }
      : { paddingVertical: 13, paddingHorizontal: 18, fontSize: 15, iconSize: 18, gap: 8 };

  return (
    <PressableScale
      onPress={disabled || loading ? undefined : onPress}
      hapticType={disabled || loading ? 'none' : hapticType}
      disabled={disabled || loading}
      style={[
        styles.base,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: variant === 'outline' ? StyleSheet.hairlineWidth : 0,
          opacity: disabled ? 0.5 : 1,
          paddingVertical: sizing.paddingVertical,
          paddingHorizontal: sizing.paddingHorizontal,
          gap: sizing.gap,
        },
        style,
      ]}
    >
      <View style={[styles.row, { gap: sizing.gap }]}>
        {loading ? (
          <ActivityIndicator color={palette.fg} size="small" />
        ) : (
          <>
            {iconLeft ? (
              <MaterialCommunityIcons name={iconLeft} size={sizing.iconSize} color={palette.fg} />
            ) : null}
            <Text
              style={[styles.text, { color: palette.fg, fontSize: sizing.fontSize }, textStyle]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {iconRight ? (
              <MaterialCommunityIcons name={iconRight} size={sizing.iconSize} color={palette.fg} />
            ) : null}
          </>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  fullWidth: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: typo.headline.fontFamily,
    letterSpacing: -0.1,
  },
});

export default IOSButton;
