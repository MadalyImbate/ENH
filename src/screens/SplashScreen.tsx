import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../theme/useAppTheme';
import { spacing, type as typo } from '../theme/tokens';

type SplashScreenProps = {
  /** true quando a hidratação da sessão terminou; o splash só sai depois disto. */
  ready: boolean;
  language: 'pt' | 'en';
  onFinish: () => void;
};

const TICK_COUNT = 48;
const GAUGE_SIZE = 220;
const TICK_RADIUS = 96;
const FILL_DURATION = 1700;

const copy = {
  pt: { tagline: 'Gás pré-pago, simples e seguro' },
  en: { tagline: 'Prepaid gas, simple and secure' },
};

export function SplashScreen({ ready, language, onFinish }: SplashScreenProps) {
  const { colors } = useAppTheme();
  const t = copy[language];

  const progress = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.9)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  const [litCount, setLitCount] = useState(0);
  const [percent, setPercent] = useState(0);
  const [animDone, setAnimDone] = useState(false);

  // Entrada do conteúdo (logo) + preenchimento do mostrador.
  useEffect(() => {
    Animated.parallel([
      Animated.spring(contentScale, { toValue: 1, tension: 90, friction: 9, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
    ]).start();

    Animated.timing(taglineOpacity, { toValue: 1, duration: 500, delay: 700, useNativeDriver: true }).start();

    const listener = progress.addListener(({ value }) => {
      setLitCount(Math.round(value * TICK_COUNT));
      setPercent(Math.round(value * 100));
    });

    Animated.timing(progress, {
      toValue: 1,
      duration: FILL_DURATION,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) setAnimDone(true);
    });

    return () => progress.removeListener(listener);
  }, [progress, contentScale, contentOpacity, taglineOpacity]);

  // Sai (cross-fade) apenas quando a animação terminou E a sessão já hidratou.
  useEffect(() => {
    if (animDone && ready) {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onFinish();
      });
    }
  }, [animDone, ready, screenOpacity, onFinish]);

  return (
    <Animated.View style={[styles.root, { backgroundColor: colors.background, opacity: screenOpacity }]}>
      <Animated.View style={{ opacity: contentOpacity, transform: [{ scale: contentScale }], alignItems: 'center' }}>
        <View style={styles.gauge}>
          {/* Traços radiais do mostrador */}
          {Array.from({ length: TICK_COUNT }).map((_, i) => {
            const angle = (i / TICK_COUNT) * 360;
            const lit = i < litCount;
            return (
              <View
                key={i}
                style={[
                  styles.tick,
                  {
                    backgroundColor: lit ? colors.primary : colors.separator,
                    transform: [{ rotate: `${angle}deg` }, { translateY: -TICK_RADIUS }],
                  },
                ]}
              />
            );
          })}

          {/* Miolo com o logo e a percentagem */}
          <View style={styles.center}>
            <Image source={require('../assets/icons/enh-kogas.png')} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.percent, { color: colors.primary }]}>{percent}%</Text>
          </View>
        </View>

        <Animated.Text style={[styles.tagline, { color: colors.labelSecondary, opacity: taglineOpacity }]}>
          {t.tagline}
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  gauge: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    position: 'absolute',
    width: 3,
    height: 13,
    borderRadius: 2,
  },
  center: {
    width: GAUGE_SIZE * 0.66,
    height: GAUGE_SIZE * 0.66,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  logo: {
    width: '86%',
    height: 60,
  },
  percent: {
    ...typo.title3,
    fontFamily: 'JetBrainsMono-Bold',
    letterSpacing: 1,
  },
  tagline: {
    ...typo.callout,
    marginTop: spacing.xl,
    fontFamily: 'Manrope_600SemiBold',
    textAlign: 'center',
  },
});

export default SplashScreen;
