import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import PressableScale from './PressableScale';
import { useAppTheme } from '../theme/useAppTheme';
import { motion, radii, type as typo } from '../theme/tokens';

export type SegmentItem = {
  value: string;
  label: string;
  icon?: string;
};

type SegmentedControlProps = {
  items: SegmentItem[];
  value: string;
  onChange: (value: string) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * iOS-style segmented control with a sliding pill indicator.
 * The pill animates between segments using a spring.
 */
export function SegmentedControl({ items, value, onChange, style }: SegmentedControlProps) {
  const { colors } = useAppTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const indicatorX = useRef(new Animated.Value(0)).current;

  const activeIndex = Math.max(0, items.findIndex(i => i.value === value));
  const segmentWidth = trackWidth > 0 ? (trackWidth - 4) / items.length : 0;

  useEffect(() => {
    Animated.spring(indicatorX, {
      toValue: 2 + activeIndex * segmentWidth,
      ...motion.spring.tight,
    }).start();
  }, [activeIndex, segmentWidth, indicatorX]);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  return (
    <View
      onLayout={onTrackLayout}
      style={[styles.track, { backgroundColor: colors.surfaceMuted, borderColor: colors.separator }, style]}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          style={[
            styles.indicator,
            {
              width: segmentWidth,
              backgroundColor: colors.surface,
              transform: [{ translateX: indicatorX }],
              shadowColor: '#0B1730',
            },
          ]}
        />
      ) : null}

      {items.map(item => {
        const isActive = item.value === value;
        return (
          <PressableScale
            key={item.value}
            scaleTo={0.96}
            hapticType="selection"
            onPress={() => {
              if (!isActive) onChange(item.value);
            }}
            style={[styles.segment, { width: segmentWidth || `${100 / items.length}%` }]}
          >
            <View style={styles.segmentInner}>
              {item.icon ? (
                <MaterialCommunityIcons
                  name={item.icon}
                  size={14}
                  color={isActive ? colors.label : colors.labelSecondary}
                />
              ) : null}
              <Text
                style={[
                  styles.segmentText,
                  {
                    color: isActive ? colors.label : colors.labelSecondary,
                    fontFamily: isActive ? 'Manrope_700Bold' : 'Manrope_600SemiBold',
                  },
                ]}
              >
                {item.label}
              </Text>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    height: 40,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 2,
    position: 'relative',
    alignItems: 'center',
  },
  indicator: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 0,
    borderRadius: radii.sm,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segment: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  segmentText: {
    fontSize: typo.subheadline.fontSize,
    letterSpacing: -0.1,
  },
});

export default SegmentedControl;
