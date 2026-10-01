import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../theme/useAppTheme';
import { motion, shadows, type as typo } from '../theme/tokens';

export type Step = {
  label: string;
  icon?: string;
};

type StepProgressProps = {
  steps: Step[];
  current: number;
};

/**
 * iOS-style horizontal step progress.
 * Inactive: hollow dot with index. Active: filled brand circle with bounce.
 * Completed: filled with check. Connector line animates fill width per step.
 */
export function StepProgress({ steps, current }: StepProgressProps) {
  const { colors } = useAppTheme();
  const total = steps.length;
  const fillProgress = useRef(new Animated.Value((current - 1) / Math.max(1, total - 1))).current;

  useEffect(() => {
    Animated.timing(fillProgress, {
      toValue: (current - 1) / Math.max(1, total - 1),
      duration: motion.durations.base,
      useNativeDriver: false,
    }).start();
  }, [current, total, fillProgress]);

  return (
    <View style={styles.row}>
      <View style={[styles.track, { backgroundColor: colors.separator }]} />
      <Animated.View
        style={[
          styles.trackFill,
          {
            backgroundColor: colors.primary,
            width: fillProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />

      {steps.map((step, idx) => {
        const stepNum = idx + 1;
        const completed = stepNum < current;
        const active = stepNum === current;
        return (
          <View key={step.label} style={styles.item}>
            <StepDot active={active} completed={completed} index={stepNum} icon={step.icon} />
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color: active || completed ? colors.label : colors.labelTertiary,
                  fontFamily: active ? 'Manrope_800ExtraBold' : 'Manrope_600SemiBold',
                },
              ]}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function StepDot({
  active,
  completed,
  index,
  icon,
}: {
  active: boolean;
  completed: boolean;
  index: number;
  icon?: string;
}) {
  const { colors } = useAppTheme();
  const scale = useRef(new Animated.Value(active ? 1 : 0.92)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: active ? 1.06 : 1, ...motion.spring.bouncy }).start();
  }, [active, scale]);

  const bg = completed || active ? colors.primary : colors.primarySoftBg;
  const border = completed || active ? colors.primary : colors.separatorStrong;
  const fg = completed || active ? colors.labelOnPrimary : colors.primarySoftFg;

  return (
    <Animated.View
      style={[
        styles.dot,
        active ? (shadows.card as object) : null,
        { backgroundColor: bg, borderColor: border, transform: [{ scale }] },
      ]}
    >
      {completed ? (
        <MaterialCommunityIcons name="check-bold" size={16} color={fg} />
      ) : icon ? (
        <MaterialCommunityIcons name={icon} size={16} color={fg} />
      ) : (
        <Text style={[styles.dotText, { color: fg }]}>{index}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    position: 'relative',
    paddingTop: 6,
  },
  track: {
    position: 'absolute',
    top: 22,
    left: '12%',
    right: '12%',
    height: 3,
    borderRadius: 2,
  },
  trackFill: {
    position: 'absolute',
    top: 22,
    left: '12%',
    height: 3,
    borderRadius: 2,
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  dot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: {
    fontSize: 13,
    fontFamily: 'Manrope_800ExtraBold',
  },
  label: {
    marginTop: 10,
    fontSize: typo.caption1.fontSize,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
});

export default StepProgress;
