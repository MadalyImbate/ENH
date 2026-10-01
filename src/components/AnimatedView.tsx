import React, { useEffect, useRef } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { motion } from '../theme/tokens';

type AnimatedViewProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  triggerKey?: string | number;
  translateY?: number;
  duration?: number;
  delay?: number;
};

/**
 * Lightweight enter animation: fade + subtle upward translate.
 * Re-runs when triggerKey changes — perfect for screen step transitions.
 */
export function AnimatedView({
  children,
  style,
  triggerKey,
  translateY = 16,
  duration = motion.durations.base,
  delay = 0,
}: AnimatedViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(translateY)).current;

  useEffect(() => {
    opacity.setValue(0);
    ty.setValue(translateY);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration, delay, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration, delay, useNativeDriver: true }),
    ]).start();
  }, [triggerKey, opacity, ty, duration, delay, translateY]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY: ty }] }, style]}>
      {children}
    </Animated.View>
  );
}

export default AnimatedView;
