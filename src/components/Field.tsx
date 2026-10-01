import React, { useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../theme/useAppTheme';
import { motion, radii, spacing, type as typo } from '../theme/tokens';

type FieldProps = TextInputProps & {
  label?: string;
  hint?: string;
  errorText?: string;
  iconLeft?: string;
  leftAdornment?: React.ReactNode;
  rightAdornment?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  monospace?: boolean;
};

/**
 * iOS-grouped input field. Shows a focused brand glow border that
 * animates on focus/blur. Supports leading icon, right adornment
 * (e.g. scan button), label, hint, and error.
 */
export function Field({
  label,
  hint,
  errorText,
  iconLeft,
  leftAdornment,
  rightAdornment,
  containerStyle,
  inputStyle,
  monospace = false,
  onFocus,
  onBlur,
  ...inputProps
}: FieldProps) {
  const { colors } = useAppTheme();
  const focus = useRef(new Animated.Value(0)).current;
  const [isFocused, setFocused] = useState(false);

  const animateTo = (value: number) =>
    Animated.timing(focus, {
      toValue: value,
      duration: motion.durations.quick,
      useNativeDriver: false,
    }).start();

  const borderColor = focus.interpolate({
    inputRange: [0, 1],
    outputRange: [
      errorText ? colors.error : colors.separatorStrong,
      errorText ? colors.error : colors.primary,
    ],
  });

  return (
    <View style={containerStyle}>
      {label ? <Text style={[styles.label, { color: colors.labelSecondary }]}>{label}</Text> : null}

      <Animated.View
        style={[
          styles.fieldShell,
          {
            backgroundColor: colors.surface,
            borderColor,
            shadowColor: colors.primary,
            shadowOpacity: isFocused && !errorText ? 0.06 : 0,
          },
        ]}
      >
        {iconLeft ? (
          <View
            style={[
              styles.iconBadge,
              { backgroundColor: isFocused && !errorText ? colors.primary : colors.primarySoftBg },
            ]}
          >
            <MaterialCommunityIcons
              name={iconLeft}
              size={16}
              color={isFocused && !errorText ? colors.labelOnPrimary : colors.primarySoftFg}
            />
          </View>
        ) : null}

        {leftAdornment ? <View style={styles.leading}>{leftAdornment}</View> : null}

        <TextInput
          {...inputProps}
          placeholderTextColor={colors.labelTertiary}
          onFocus={e => {
            setFocused(true);
            animateTo(1);
            onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            animateTo(0);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            { color: colors.label },
            monospace ? { fontFamily: 'JetBrainsMono-Bold', letterSpacing: 1 } : null,
            inputStyle,
          ]}
        />

        {rightAdornment ? <View style={styles.adornment}>{rightAdornment}</View> : null}
      </Animated.View>

      {errorText ? (
        <Text style={[styles.helper, { color: colors.error }]}>{errorText}</Text>
      ) : hint ? (
        <Text style={[styles.helper, { color: colors.labelTertiary }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: typo.caption1.fontSize,
    fontFamily: 'Manrope_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  fieldShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 8,
    minHeight: 50,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 11,
    fontFamily: 'Manrope_500Medium',
    fontSize: typo.body.fontSize,
  },
  leading: {
    marginRight: spacing.sm,
  },
  adornment: {
    marginLeft: spacing.sm,
  },
  helper: {
    marginTop: 6,
    fontSize: typo.footnote.fontSize,
    fontFamily: 'Manrope_600SemiBold',
  },
});

export default Field;
