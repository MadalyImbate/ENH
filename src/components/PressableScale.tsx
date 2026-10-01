import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { motion } from '../theme/tokens';
import { haptic } from '../utils/haptics';

type HapticType = 'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  hapticType?: HapticType | 'none';
  children?: React.ReactNode;
};

/**
 * iOS-style touch primitive. Springs down to ~0.97 on press in and
 * releases with a soft spring. Provides haptic feedback by default.
 *
 * Use everywhere a button, card, or chip is tappable — it makes the
 * whole app feel alive.
 */
export function PressableScale({
  style,
  scaleTo = 0.97,
  hapticType = 'selection',
  onPressIn,
  onPressOut,
  children,
  ...rest
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = (event: GestureResponderEvent) => {
    Animated.spring(scale, { toValue: scaleTo, ...motion.spring.tight }).start();
    if (hapticType !== 'none') haptic(hapticType);
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    Animated.spring(scale, { toValue: 1, ...motion.spring.bouncy }).start();
    onPressOut?.(event);
  };

  return (
    <Pressable {...rest} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}

export default PressableScale;
